import {createError, defineEventHandler, getValidatedQuery, getValidatedRouterParams, setResponseStatus} from 'h3'
import {z} from 'zod'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import {getRequiredUser} from '~~/server/utils/authorizationHelper'
import {fetchDinnerEvent, fetchOrderHistoryForDinner} from '~~/server/data/financesRepository'
import {fetchHouseholds, fetchSeason} from '~~/server/data/prismaRepository'
import {useBookingValidation, type TicketChangesResponse} from '~/composables/useBookingValidation'
import {useBooking} from '~/composables/useBooking'

const {throwH3Error} = eventHandlerHelper
const LOG = '🎟️ > CHEF > ORDER_HISTORY > [GET]'
const paramsSchema = z.object({id: z.coerce.number().int().positive()})
const querySchema = z.object({since: z.coerce.date().optional()})

/**
 * GET /api/chef/dinner/[id]/order-history?since= - the dinner's ticket changes, newest first
 *
 * The whole history replays server-side so every change carries the composition after it; `since` keeps the changes
 * from that moment and counts the older ones, so the pane opens on the stretch from the menu deadline and loads the
 * rest on demand. Open to every logged-in user, as the dinner's budget is.
 */
export default defineEventHandler(async (event): Promise<TicketChangesResponse> => {
    const d1Client = event.context.cloudflare.env.DB
    const {TicketChangesResponseSchema} = useBookingValidation()
    const {replayTicketChanges} = useBooking()

    let id!: number
    let since: Date | undefined
    try {
        ({id} = await getValidatedRouterParams(event, paramsSchema.parse))
        ;({since} = await getValidatedQuery(event, querySchema.parse))
    } catch (error) {
        return throwH3Error(`${LOG} Input validation error`, error, 400)
    }

    await getRequiredUser(event)

    try {
        const dinner = await fetchDinnerEvent(d1Client, id)
        if (!dinner?.seasonId) throw createError({statusCode: 404, message: `Dinner event ${id} not found in a season`})
        const [season, households, history] = await Promise.all([
            fetchSeason(d1Client, dinner.seasonId), fetchHouseholds(d1Client), fetchOrderHistoryForDinner(d1Client, id)
        ])
        const ticketTypeOf = (ticketPriceId: number) => season?.ticketPrices.find(price => price.id === ticketPriceId)?.ticketType ?? null
        // A creation row names its household by id; the snapshot rows carry the short name themselves
        const shortNames = new Map(households.map(household => [household.id, household.shortName]))
        const householdShortnameOf = (householdId: number) => shortNames.get(householdId) ?? null

        const all = replayTicketChanges(history, ticketTypeOf, householdShortnameOf).reverse()
        const changes = since ? all.filter(change => change.timestamp >= since) : all
        setResponseStatus(event, 200)
        return TicketChangesResponseSchema.parse({dinnerEventId: id, since: since ?? null, changes, olderCount: all.length - changes.length})
    } catch (error) {
        return throwH3Error(`${LOG} Error reading the ticket changes of dinner ${id}`, error)
    }
})
