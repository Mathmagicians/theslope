import {createError, defineEventHandler, getValidatedQuery, readValidatedBody, setResponseStatus} from 'h3'
import {z} from 'zod'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import {getRequiredUser, requireHouseholdAccess} from '~~/server/utils/authorizationHelper'
import {isAdmin} from '~/composables/usePermissions'
import {fetchInhabitant, fetchSeason, fetchUser} from '~~/server/data/prismaRepository'
import {fetchDinnerEvent} from '~~/server/data/financesRepository'
import {createWaitlistEntry, fetchWaitlistForDinner} from '~~/server/data/waitlistRepository'
import {portionsOfEntryFor} from '~~/server/utils/waitlistAssignment'
import {emitWaitlistJoined, emitWaitlistBuildup} from '~~/server/utils/sender/events/waitlist'
import {getNotificationConfig} from '~~/server/utils/sender/config'
import {useWaitlistValidation, type WaitlistJoinRequest, type WaitlistJoinResult} from '~/composables/useWaitlistValidation'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useWaitlist} from '~/composables/useWaitlist'

const {throwH3Error} = eventHandlerHelper
const LOG = '⏳ > WAITLIST > [PUT]'
const querySchema = z.object({adminBypass: z.coerce.boolean().optional()})

/**
 * PUT /api/household/waitlist - join the waiting list of a sold-out dinner
 *
 * The entry holds the order in its create shape with the price frozen from the ticket price. One regular entry per
 * inhabitant per dinner (409 from the unique index); guest entries carry the booking member's inhabitant.
 * The joining user hears their position; the chef hears when the queue crosses the buildup threshold.
 */
export default defineEventHandler(async (event): Promise<WaitlistJoinResult> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    const {WaitlistJoinRequestSchema, WaitlistJoinResultSchema} = useWaitlistValidation()
    const {OrderStateSchema, DinnerStateSchema} = useBookingValidation()
    const {positionOf, portionNeed} = useWaitlist()

    let body!: WaitlistJoinRequest
    try {
        body = await readValidatedBody(event, WaitlistJoinRequestSchema.parse)
    } catch (error) {
        return throwH3Error(`${LOG} Input validation error`, error, 400)
    }

    const user = await getRequiredUser(event)
    const {adminBypass} = await getValidatedQuery(event, querySchema.parse)
    await requireHouseholdAccess(event, body.householdId, adminBypass ? isAdmin : undefined)

    try {
        const inhabitant = await fetchInhabitant(d1Client, body.inhabitantId)
        if (!inhabitant) throw createError({statusCode: 404, message: `Inhabitant ${body.inhabitantId} not found`})
        if (inhabitant.householdId !== body.householdId) {
            throw createError({statusCode: 400, message: `Inhabitant ${body.inhabitantId} does not belong to household ${body.householdId}`})
        }
        const dinner = await fetchDinnerEvent(d1Client, body.dinnerEventId)
        if (!dinner?.seasonId) throw createError({statusCode: 404, message: `Dinner event ${body.dinnerEventId} not found in a season`})
        // A queue exists for a dinner still to come
        if (dinner.state === DinnerStateSchema.enum.CONSUMED || dinner.state === DinnerStateSchema.enum.CANCELLED) {
            throw createError({statusCode: 400, message: `Dinner event ${body.dinnerEventId} is ${dinner.state}`})
        }
        const season = await fetchSeason(d1Client, dinner.seasonId)
        const ticketPrice = season?.ticketPrices.find(price => price.id === body.ticketPriceId)
        if (!ticketPrice) throw createError({statusCode: 404, message: `Ticket price ${body.ticketPriceId} not found in the dinner's season`})

        const entry = await createWaitlistEntry(d1Client, {
            dinnerEventId: body.dinnerEventId,
            inhabitantId: body.inhabitantId,
            isGuestTicket: body.isGuestTicket,
            order: {
                dinnerEventId: body.dinnerEventId,
                inhabitantId: body.inhabitantId,
                bookedByUserId: user.id,
                ticketPriceId: body.ticketPriceId,
                priceAtBooking: ticketPrice.price,
                householdId: body.householdId,
                dinnerMode: body.dinnerMode,
                state: OrderStateSchema.enum.BOOKED,
                isGuestTicket: body.isGuestTicket,
                allergyTypeIds: body.allergyTypeIds
            }
        })

        const queue = await fetchWaitlistForDinner(d1Client, body.dinnerEventId)
        const position = positionOf(queue, entry.id) ?? queue.length
        const sender = {queue: cloudflare.env.SENDER, config: getNotificationConfig(event)}
        const context = {dinnerEventId: dinner.id, date: dinner.date, menuTitle: dinner.menuTitle}
        const notification = await emitWaitlistJoined(sender.queue, sender.config, user.email, inhabitant.name, context, position)

        // The queue crossed the threshold with this entry: the chef hears it once
        const threshold = useAppConfig().theslope.waitlistBuildupThreshold
        if (queue.length === threshold && dinner.chefId) {
            const chef = await fetchInhabitant(d1Client, dinner.chefId)
            const chefUser = chef?.userId ? await fetchUser(d1Client, {id: chef.userId}) : null
            const portions = portionNeed(queue, portionsOfEntryFor(season!.ticketPrices))
            await emitWaitlistBuildup(sender.queue, sender.config, chefUser?.email ?? null, chef?.name ?? '', context, queue.length, portions)
        }

        console.info(`${LOG} Inhabitant ${body.inhabitantId} is #${position} in the queue of dinner ${body.dinnerEventId}`)
        setResponseStatus(event, 201)
        return WaitlistJoinResultSchema.parse({...entry, position, notification: {queued: notification.queued, dedupeKey: notification.dedupeKey}})
    } catch (error) {
        return throwH3Error(`${LOG} Error joining the waiting list of dinner ${body.dinnerEventId}`, error)
    }
})
