import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {fetchOrder} from "~~/server/data/prismaRepository"
import {z} from "zod"
import type { Order } from '~/composables/useOrderValidation'
const {h3eFromCatch} = eventHandlerHelper

const idSchema = z.object({
    id: z.coerce.number().int().positive('ID must be a positive integer')
})

export default defineEventHandler(async (event):Promise<Order> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    let id, order
    try {
        ({id} = await getValidatedRouterParams(event, idSchema.parse))
    } catch (error) {
        const h3e = h3eFromCatch('🎟️ > ORDER > [GET] Input validation error', error)
        console.error(`🎟️ > ORDER > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }

    try {
        console.info(`🎟️ > ORDER > [GET] Fetching order ${id}`)
        order = await fetchOrder(d1Client, id)

    } catch (error) {
        const h3e = h3eFromCatch(`🎟️ > ORDER > [GET] Error fetching order ${id}`, error)
        console.error(`🎟️ > ORDER > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
    if (!order) {
        throw createError({
            statusCode: 404,
            message: `🎟️ > ORDER > [GET] Order ${id} not found`
        })
    }

    console.info(`🎟️ > ORDER > [GET] Successfully fetched order ${order.id}`)
    setResponseStatus(event, 200)
    return order
})
