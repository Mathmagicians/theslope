/**
 * GET /api/order - Fetch orders
 *
 * Query params:
 * - dinnerEventIds: Optional array of dinner event IDs (0=all, 1=single, many=multiple)
 * - upcomingForSeason: Season ID - fetch orders for upcoming dinner events (next + future)
 *                      Server computes upcoming IDs from season's dinnerEvents
 * - state: Optional filter by order state (e.g., RELEASED for claim queue)
 * - sortBy: 'createdAt' (default) or 'releasedAt' (FIFO for claim queue)
 * - allHouseholds: false (default) = filter by session user's household
 *                  true = return orders from all households
 *
 * ADR-002: Separate try-catch for validation and business logic
 * ADR-004: Logging standards
 */
import {fetchOrders} from "~~/server/data/financesRepository"
import {fetchSeason} from "~~/server/data/prismaRepository"
import {useBookingValidation} from "~/composables/useBookingValidation"
import {useSeason} from "~/composables/useSeason"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {z} from "zod"
import type { OrderDisplay } from '~/composables/useBookingValidation'
import type { UserDetail } from '~/composables/useCoreValidation'

const {throwH3Error} = eventHandlerHelper
const {OrderStateSchema, IdOrIdsSchema} = useBookingValidation()

const sortBySchema = z.enum(['createdAt', 'releasedAt']).default('createdAt')

const querySchema = z.object({
    dinnerEventIds: IdOrIdsSchema,
    upcomingForSeason: z.coerce.number().int().positive().optional(),
    state: OrderStateSchema.optional(),
    sortBy: sortBySchema.optional(),
    allHouseholds: z.coerce.boolean().optional().default(false),
    includeProvenance: z.coerce.boolean().optional().default(false),
    includeDinnerContext: z.coerce.boolean().optional().default(false),
    householdId: z.coerce.number().int().positive().optional()
}).refine(
    (data) => !(data.householdId && data.allHouseholds),
    { message: 'Cannot specify both householdId and allHouseholds=true' }
).refine(
    (data) => !(data.upcomingForSeason && data.dinnerEventIds.length > 0),
    { message: 'Cannot specify both upcomingForSeason and dinnerEventIds' }
)

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

    // Determine household filter: explicit householdId > session user's household
    // Note: allHouseholds=true + householdId is rejected by schema validation
    let householdId: number | undefined
    if (query.householdId) {
        // Explicit household (admin viewing another household)
        householdId = query.householdId
    } else if (!query.allHouseholds) {
        // Default: filter by session user's household
        const session = await getUserSession(event)
        const user = session?.user as UserDetail | undefined
        householdId = user?.Inhabitant?.householdId

        if (!householdId) {
            console.warn(`${LOG} User has no household - returning empty array`)
            return []
        }
    }
    // else: allHouseholds=true with no householdId → no filter (marketplace view)

    // Business logic
    try {
        // Determine event IDs: explicit list, upcoming for season, or all
        let eventIds: number[] | undefined

        if (query.upcomingForSeason) {
            // Fetch season and compute upcoming dinner IDs
            const season = await fetchSeason(d1Client, query.upcomingForSeason)
            if (!season) {
                throw createError({ statusCode: 404, message: `Season ${query.upcomingForSeason} not found` })
            }

            const {splitDinnerEvents} = useSeason()
            const {nextDinner, futureDinners} = splitDinnerEvents(season.dinnerEvents ?? [])
            eventIds = [
                ...(nextDinner ? [nextDinner.id] : []),
                ...futureDinners.map(e => e.id)
            ]
            console.info(`${LOG} Upcoming for season ${query.upcomingForSeason}: ${eventIds.length} dinner events`)

            if (eventIds.length === 0) {
                return []
            }
        } else if (query.dinnerEventIds.length > 0) {
            eventIds = query.dinnerEventIds
        }

        const orders = await fetchOrders(d1Client, eventIds, householdId, query.state, query.sortBy, query.includeProvenance, query.includeDinnerContext)
        console.info(`${LOG} Fetched ${orders.length} orders${householdId ? ` for household ${householdId}` : ' (all households)'}`)
        setResponseStatus(event, 200)
        return orders
    } catch (error) {
        return throwH3Error(`${LOG} Error fetching orders`, error)
    }
})
