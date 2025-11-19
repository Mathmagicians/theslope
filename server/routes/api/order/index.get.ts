import {fetchOrders} from "~~/server/data/financesRepository"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {z} from "zod"
import type { OrderDisplay } from '~/composables/useBookingValidation'

const {throwH3Error} = eventHandlerHelper

const querySchema = z.object({
    dinnerEventId: z.coerce.number().int().positive().optional()
})

export default defineEventHandler(async (event): Promise<OrderDisplay[]> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    let dinnerId: number | undefined
    try {
        const query = await getValidatedQuery(event, querySchema.parse)
        dinnerId = query.dinnerEventId
    } catch (error) {
        throwH3Error('🎟️ > ORDER > [GET] Input validation error', error)
    }

    try {
        console.info(`🎟️ > ORDER > [GET] Fetching orders for dinnerId=${dinnerId}`)
        const orders = await fetchOrders(d1Client, dinnerId)
        console.info(`🎟️ > ORDER > [GET] Successfully fetched ${orders.length} orders for dinnerId=${dinnerId}`)
        setResponseStatus(event, 200)
        return orders
    } catch (error) {
        throwH3Error('🎟️ > ORDER > [GET] Error fetching orders', error)
    }

})
