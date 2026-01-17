/**
 * GET /api/order - Fetch orders
 *
 * Query params:
 * - dinnerEventIds: Optional array of dinner event IDs (0=all, 1=single, many=multiple)
 * - state: Optional filter by order state (e.g., RELEASED for claim queue)
 * - sortBy: 'createdAt' (default) or 'releasedAt' (FIFO for claim queue)
 * - allHouseholds: false (default) = filter by session user's household
 *                  true = return orders from all households
 *
 * ADR-002: Separate try-catch for validation and business logic
 * ADR-004: Logging standards
 */
import {fetchOrders} from "~~/server/data/financesRepository"
import {useBookingValidation} from "~/composables/useBookingValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {z} from "zod"
import type { OrderDisplay } from '~/composables/useBookingValidation'
import type { UserDetail } from '~/composables/useCoreValidation'

const {throwH3Error} = eventHandlerHelper
const {OrderStateSchema, IdOrIdsSchema} = useBookingValidation()

const sortBySchema = z.enum(['createdAt', 'releasedAt']).default('createdAt')

const querySchema = z.object({
    dinnerEventIds: IdOrIdsSchema,
    state: OrderStateSchema.optional(),
    sortBy: sortBySchema.optional(),
    allHouseholds: z.coerce.boolean().optional().default(false),
    includeProvenance: z.coerce.boolean().optional().default(false)
})

export default defineEventHandler(async (event): Promise<OrderDisplay[]> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    const LOG = '🎟️ > ORDER > [GET]'

    // Validate query params
    let query: z.infer<typeof querySchema>
    try {
        query = await getValidatedQuery(event, querySchema.parse)
    } catch (error) {
        return throwH3Error(`${LOG} Input validation error`, error)
    }

    // Determine household filter: skip if allHouseholds=true, otherwise use session
    let householdId: number | undefined
    if (!query.allHouseholds) {
        const session = await getUserSession(event)
        const user = session?.user as UserDetail | undefined
        householdId = user?.Inhabitant?.householdId

        if (!householdId) {
            console.warn(`${LOG} User has no household - returning empty array`)
            return []
        }
    }

    // Business logic
    try {
        // Pass array (empty = all events, otherwise filter by IDs)
        const eventIds = query.dinnerEventIds.length > 0 ? query.dinnerEventIds : undefined
        const orders = await fetchOrders(d1Client, eventIds, householdId, query.state, query.sortBy, query.includeProvenance)
        console.info(`${LOG} Fetched ${orders.length} orders${householdId ? ` for household ${householdId}` : ' (all households)'}`)
        setResponseStatus(event, 200)
        return orders
    } catch (error) {
        return throwH3Error(`${LOG} Error fetching orders`, error)
    }
})
