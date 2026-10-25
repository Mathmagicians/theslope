import {createError, defineEventHandler, getValidatedQuery, getValidatedRouterParams, setResponseStatus} from 'h3'
import {z} from 'zod'
import {idParams} from '~/composables/useCoreValidation'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import {getRequiredUser} from '~~/server/utils/authorizationHelper'
import {fetchDinnerEvent, fetchOrderHistoryForDinners} from '~~/server/data/financesRepository'
import {fetchHouseholdsByIds, fetchHouseholdsByInhabitantIds, fetchSeason} from '~~/server/data/prismaRepository'
import {getSystemUserId} from '~~/server/utils/systemUser'
import {useBookingValidation, type TicketChangesResponse} from '~/composables/useBookingValidation'
import {useBooking} from '~/composables/useBooking'
import {useSeason} from '~/composables/useSeason'

const {throwH3Error} = eventHandlerHelper
const LOG = '🎟️ > CHEF > ORDER_HISTORY > [GET]'
const paramSchema = idParams('id')
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
    const {TicketChangesResponseSchema, OrderAuditActionSchema, readOrderAudit} = useBookingValidation()
    const {replayTicketChanges} = useBooking()
    const {deadlinesForSeason} = useSeason()

    let id!: number
    let since: Date | undefined
    try {
        ({id} = await getValidatedRouterParams(event, paramSchema.parse))
        ;({since} = await getValidatedQuery(event, querySchema.parse))
    } catch (error) {
        return throwH3Error(`${LOG} Input validation error`, error, 400)
    }

    await getRequiredUser(event)

    try {
        const dinner = await fetchDinnerEvent(d1Client, id)
        if (!dinner?.seasonId) throw createError({statusCode: 404, message: `Dinner event ${id} not found in a season`})
        // The reads go one after another (ADR-014)
        const season = await fetchSeason(d1Client, dinner.seasonId)
        const history = await fetchOrderHistoryForDinners(d1Client, [id])
        const systemUserId = await getSystemUserId(d1Client)
        // A legacy creation row names its household by id; a snapshot carries the short name itself
        const unnamedHouseholdIds = history.map(readOrderAudit)
            .flatMap(audit => audit?.householdId && !audit.householdShortname ? [audit.householdId] : [])
        // A sale's row names the buyer's inhabitant; its snapshot names the seller's household
        const buyerIds = history.flatMap(row => row.action === OrderAuditActionSchema.enum.USER_CLAIMED && row.inhabitantId !== null ? [row.inhabitantId] : [])
        const households = await fetchHouseholdsByIds(d1Client, unnamedHouseholdIds)
        const buyerHouseholds = await fetchHouseholdsByInhabitantIds(d1Client, buyerIds)
        const ticketPriceOf = (ticketPriceId: number) => season?.ticketPrices.find(price => price.id === ticketPriceId) ?? null
        const shortNames = new Map(households.map(household => [household.id, household.shortName]))
        const householdShortnameOf = (householdId: number) => shortNames.get(householdId) ?? null
        const householdByInhabitant = new Map(buyerHouseholds.flatMap(household => household.inhabitants.map(inhabitant => [inhabitant.id, household] as const)))
        const householdOfInhabitant = (inhabitantId: number) => householdByInhabitant.get(inhabitantId) ?? null
        // The moment Framelding closes: after it only the admin's correction deletes an order
        const bookingDeadline = season ? deadlinesForSeason(season).getBookingDeadlineTime(dinner.date) : undefined

        const all = replayTicketChanges(history, ticketPriceOf, systemUserId, householdShortnameOf, householdOfInhabitant, bookingDeadline).reverse()
        const changes = since ? all.filter(change => change.timestamp >= since) : all
        setResponseStatus(event, 200)
        return TicketChangesResponseSchema.parse({dinnerEventId: id, since: since ?? null, changes, olderCount: all.length - changes.length})
    } catch (error) {
        return throwH3Error(`${LOG} Error reading the ticket changes of dinner ${id}`, error)
    }
})
