/**
 * GET /api/order - Fetch orders for current user's household
 *
 * User-facing endpoint - always filters by session user's household.
 * Pattern: Session-derived filtering (like /api/team/my)
 *
 * Query params:
 * - dinnerEventId: Optional filter by specific dinner event
 *
 * ADR-002: Separate try-catch for validation and business logic
 * ADR-004: Logging standards
 */
import {fetchOrders} from "~~/server/data/financesRepository"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {z} from "zod"
import type { OrderDisplay } from '~/composables/useBookingValidation'
import type { UserDetail } from '~/composables/useCoreValidation'

const {throwH3Error} = eventHandlerHelper

const querySchema = z.object({
    dinnerEventId: z.coerce.number().int().positive().optional()
})

export default defineEventHandler(async (event): Promise<OrderDisplay[]> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Get authenticated user's household ID from session
    const session = await getUserSession(event)
    const user = session?.user as UserDetail | undefined
    const householdId = user?.Inhabitant?.householdId

    if (!householdId) {
        console.warn('🎟️ > ORDER > [GET] User has no household - returning empty array')
        return []
    }

    // Validate query params
    let dinnerId: number | undefined
    try {
        const query = await getValidatedQuery(event, querySchema.parse)
        dinnerId = query.dinnerEventId
    } catch (error) {
        return throwH3Error('🎟️ > ORDER > [GET] Input validation error', error)
    }

    // Business logic
    try {
        const orders = await fetchOrders(d1Client, dinnerId, householdId)
        console.info(`🎟️ > ORDER > [GET] Fetched ${orders.length} orders for household ${householdId}`)
        setResponseStatus(event, 200)
        return orders
    } catch (error) {
        return throwH3Error('🎟️ > ORDER > [GET] Error fetching orders', error)
    }
})
