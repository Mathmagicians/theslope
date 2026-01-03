import {deleteOrder} from "~~/server/data/financesRepository"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import type { OrderDisplay } from '~/composables/useBookingValidation'
import {z} from "zod"

const {throwH3Error, getSessionUserId} = eventHandlerHelper

const idSchema = z.object({
    id: z.coerce.number().int().positive('ID must be a positive integer')
})

/**
 * Delete an order (user-initiated cancellation)
 *
 * DELETE /api/order/[id]
 *
 * Uses authenticated user's ID for audit trail:
 * - Creates USER_CANCELLED audit entry (respected by scaffolder - won't recreate)
 * - If no session, creates SYSTEM_DELETED entry (may be re-created by scaffolder)
 */
export default defineEventHandler(async (event):Promise<OrderDisplay> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    const PREFIX = '🎟️ > ORDER > [DELETE]'

    // Input validation try-catch - FAIL EARLY
    let id!: number
    try {
        ({id} = await getValidatedRouterParams(event, idSchema.parse))
    } catch (error) {
        return throwH3Error(`${PREFIX} Input validation error`, error)
    }

    // Get authenticated user ID for audit trail
    const performedByUserId = await getSessionUserId(event)

    console.info(`${PREFIX} Deleting order ${id} (performedByUserId: ${performedByUserId ?? 'admin/system'})`)

    // Database operations try-catch - separate concerns
    try {
        const [deletedOrder] = await deleteOrder(d1Client, id, performedByUserId)
        if (!deletedOrder) {
            return throwH3Error(`${PREFIX} Order ${id} not found`, new Error('Not found'), 404)
        }
        return deletedOrder
    } catch (error) {
        return throwH3Error(`${PREFIX} Error deleting order ${id}`, error)
    }
})
