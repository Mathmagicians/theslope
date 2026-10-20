import {defineEventHandler, getValidatedQuery, setResponseStatus} from 'h3'
import {z} from 'zod'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import {fetchWaitlistForDinners} from '~~/server/data/waitlistRepository'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useWaitlistValidation, type TicketWaitlistDisplay} from '~/composables/useWaitlistValidation'

const {throwH3Error} = eventHandlerHelper
const LOG = '🎟️ > ORDER > WAITLIST > [GET]'

const {IdOrIdsSchema} = useBookingValidation()
const querySchema = z.object({dinnerEventIds: IdOrIdsSchema})

/**
 * GET /api/order/waitlist?dinnerEventIds=X&dinnerEventIds=Y - every queue entry of those dinners in queue order
 * (createdAt, then id), readable by every member; the household is `order.householdId`
 */
export default defineEventHandler(async (event): Promise<TicketWaitlistDisplay[]> => {
    const d1Client = event.context.cloudflare.env.DB
    const {TicketWaitlistDisplaySchema} = useWaitlistValidation()

    let dinnerEventIds!: number[]
    try {
        const query = await getValidatedQuery(event, querySchema.parse)
        dinnerEventIds = Array.isArray(query.dinnerEventIds) ? query.dinnerEventIds : [query.dinnerEventIds]
    } catch (error) {
        return throwH3Error(`${LOG} Input validation error`, error, 400)
    }

    try {
        const entries = await fetchWaitlistForDinners(d1Client, dinnerEventIds)
        console.info(`${LOG} ${entries.length} entries on dinners ${dinnerEventIds.join(', ')}`)
        setResponseStatus(event, 200)
        return TicketWaitlistDisplaySchema.array().parse(entries)
    } catch (error) {
        return throwH3Error(`${LOG} Error reading the queues of dinners ${dinnerEventIds.join(', ')}`, error)
    }
})
