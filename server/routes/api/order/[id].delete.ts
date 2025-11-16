import {deleteOrder} from "~~/server/data/prismaRepository"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import type { OrderDisplay } from '~/composables/useOrderValidation'
import {z} from "zod"

const {h3eFromCatch} = eventHandlerHelper

const idSchema = z.object({
    id: z.coerce.number().int().positive('ID must be a positive integer')
})

export default defineEventHandler(async (event):Promise<OrderDisplay> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let id
    try {
        ({id} = await getValidatedRouterParams(event, idSchema.parse))
    } catch (error) {
        const h3e = h3eFromCatch('🎟️ > ORDER > [DELETE] Input validation error', error)
        console.error(`🎟️ > ORDER > [DELETE] ${h3e.statusMessage}`, error)
        throw h3e
    }

    // Database operations try-catch - separate concerns
    try {
        console.info(`🎟️ > ORDER > [DELETE] Deleting order ${id}`)
        const deletedOrder = await deleteOrder(d1Client, id)
        console.info(`🎟️ > ORDER > [DELETE] Successfully deleted order ${deletedOrder.id}`)
        return deletedOrder
    } catch (error) {
        const h3e = h3eFromCatch(`🎟️ > ORDER > [DELETE] Error deleting order ${id}`, error)
        console.error(`🎟️ > ORDER > [DELETE] ${h3e.statusMessage}`, error)
        throw h3e
    }
})
