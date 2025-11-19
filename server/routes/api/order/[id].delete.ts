import {deleteOrder} from "~~/server/data/financesRepository"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import type { OrderDisplay } from '~/composables/useBookingValidation'
import {z} from "zod"

const {throwH3Error} = eventHandlerHelper

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
        throwH3Error('🎟️ > ORDER > [DELETE] Input validation error', error)
    }

    // Database operations try-catch - separate concerns
    try {
        console.info(`🎟️ > ORDER > [DELETE] Deleting order ${id}`)
        const deletedOrder = await deleteOrder(d1Client, id)
        console.info(`🎟️ > ORDER > [DELETE] Successfully deleted order ${deletedOrder.id}`)
        return deletedOrder
    } catch (error) {
        throwH3Error(`🎟️ > ORDER > [DELETE] Error deleting order ${id}`, error)
    }
})
