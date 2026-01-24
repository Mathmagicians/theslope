import {deleteOrder, fetchOrder} from "~~/server/data/financesRepository"
import {requireHouseholdAccess} from "~~/server/utils/authorizationHelper"
import {isAdmin} from '~/composables/usePermissions'
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import type { OrderDisplay } from '~/composables/useBookingValidation'
import {z} from "zod"

const {throwH3Error, getSessionUserId} = eventHandlerHelper

const idSchema = z.object({
    id: z.coerce.number().int().positive('ID must be a positive integer')
})

const querySchema = z.object({
    adminBypass: z.coerce.boolean().optional()
})

/**
 * Delete an order (user-initiated cancellation)
 *
 * DELETE /api/order/[id]
 *
 * Authorization:
 * - User must belong to the order's household
 * - Admin can bypass via ?adminBypass=true query param
 *
 * Uses authenticated user's ID for audit trail:
 * - Creates USER_CANCELLED audit entry (respected by scaffolder - won't recreate)
 * - If no session, creates SYSTEM_DELETED entry (may be re-created by scaffolder)
 */
export default defineEventHandler(async (event):Promise<OrderDisplay> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    const PREFIX = '🎟️ > ORDER > [DELETE]'

    // Input validation try-catch - FAIL EARLY (ADR-002)
    let id!: number
    let adminBypass: boolean | undefined
    try {
        ({id} = await getValidatedRouterParams(event, idSchema.parse))
        ;({adminBypass} = await getValidatedQuery(event, querySchema.parse))
    } catch (error) {
        return throwH3Error(`${PREFIX} Input validation error`, error)
    }

    // Business logic try-catch (ADR-002)
    try {
        // Fetch order to get householdId for authorization
        const existingOrder = await fetchOrder(d1Client, id)
        if (!existingOrder) {
            return throwH3Error(`${PREFIX} Order ${id} not found`, new Error('Not found'), 404)
        }

        // Authorization: User must belong to the order's household (admin can bypass via ?adminBypass=true)
        await requireHouseholdAccess(event, existingOrder.inhabitant.householdId, adminBypass ? isAdmin : undefined)

        // Get authenticated user ID for audit trail
        const performedByUserId = await getSessionUserId(event)

        console.info(`${PREFIX} Deleting order ${id} (performedByUserId: ${performedByUserId ?? 'admin/system'}, adminBypass: ${adminBypass ?? false})`)

        const [deletedOrder] = await deleteOrder(d1Client, id, performedByUserId)
        if (!deletedOrder) {
            return throwH3Error(`${PREFIX} Order ${id} not found after fetch`, new Error('Not found'), 404)
        }
        return deletedOrder
    } catch (error) {
        return throwH3Error(`${PREFIX} Error deleting order ${id}`, error)
    }
})
