import {fetchOrders} from "~~/server/data/prismaRepository"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {z} from "zod"
import type { OrderDisplay } from '~/composables/useOrderValidation'

const {h3eFromCatch} = eventHandlerHelper

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
        const h3e = h3eFromCatch('🎟️ > ORDER > [GET] Input validation error', error)
        console.error(`🎟️ > ORDER > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }

    try {
        console.info(`🎟️ > ORDER > [GET] Fetching orders for dinnerId=${dinnerId}`)
        const orders = await fetchOrders(d1Client, dinnerId)
        console.info(`🎟️ > ORDER > [GET] Successfully fetched ${orders.length} orders for dinnerId=${dinnerId}`)
        setResponseStatus(event, 200)
        return orders
    } catch (error) {
        const h3e = h3eFromCatch('🎟️ > ORDER > [GET] Error fetching orders', error)
        console.error(`🎟️ > ORDER > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }

})
