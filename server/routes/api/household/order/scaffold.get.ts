import {defineEventHandler, getValidatedQuery, setResponseStatus} from "h3"
import {z} from "zod"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {getRequiredUser} from "~~/server/utils/authorizationHelper"
import {isAdmin} from '~/composables/usePermissions'
import {useBookingValidation, type ScaffoldOrdersRequest, type ScaffoldOrdersResponse} from "~/composables/useBookingValidation"
import {scaffoldPrebookings} from "~~/server/utils/scaffoldPrebookings"
import {useBooking} from "~/composables/useBooking"
import {QueryFlagSchema, RouteIdSchema} from '~/composables/useCoreValidation'
import {OPEN_DEADLINES} from '~/composables/useSeason'

const {throwH3Error} = eventHandlerHelper

const LOG = '🎟️ > HOUSEHOLD > [SCAFFOLD PREVIEW]'

const {IdOrIdsSchema, DesiredOrderQuerySchema} = useBookingValidation()
const querySchema = z.object({
    householdId: RouteIdSchema,
    seasonId: RouteIdSchema.optional(),
    dinnerEventIds: IdOrIdsSchema,
    orders: z.union([DesiredOrderQuerySchema, DesiredOrderQuerySchema.array()]).optional(),
    bypassDeadlines: QueryFlagSchema
})

/**
 * GET /api/household/order/scaffold?householdId=H&dinnerEventIds=D&orders=<code>&bypassDeadlines=true
 * The dry run of the booking write (ADR-016): the reply the save of the draft would give, settled against the tickets
 * for sale and the waiting list as they stand; nothing is written and no mail goes out
 *
 * - `orders`: the draft, one `DesiredOrderQuerySchema` value per desired order, decided as the session user's
 * - No orders: the household's next run on the dinners asked, the bookings its preferences make there
 * - `bypassDeadlines=true` from an admin: the deadlines lift as on the admin's correction; ignored for anyone else
 *
 * Requires: authenticated user; any member reads any household's (ADR-004)
 */
export default defineEventHandler<Promise<ScaffoldOrdersResponse>>(async (event) => {
    const d1Client = event.context.cloudflare.env.DB
    const {ScaffoldOrdersRequestSchema, ScaffoldOrdersResponseSchema} = useBookingValidation()

    // Input validation (ADR-002)
    let requestData!: ScaffoldOrdersRequest
    let bypassDeadlines!: boolean
    try {
        const query = await getValidatedQuery(event, querySchema.parse)
        requestData = ScaffoldOrdersRequestSchema.parse({
            householdId: query.householdId,
            seasonId: query.seasonId,
            dinnerEventIds: query.dinnerEventIds,
            orders: [query.orders ?? []].flat()
        })
        bypassDeadlines = query.bypassDeadlines
    } catch (error) {
        return throwH3Error(`${LOG} Input validation error`, error)
    }

    const user = await getRequiredUser(event)

    // Business logic (ADR-002)
    try {
        console.info(`${LOG} User ${user.email} previewing ${requestData.orders.length} orders for household ${requestData.householdId}`)

        // User mode on the orders; no orders runs system mode, as the household's next run would
        const nextRun = requestData.orders.length === 0
        const adminCorrection = bypassDeadlines && isAdmin(user)
        const result = await scaffoldPrebookings(d1Client, {
            seasonId: requestData.seasonId,
            householdId: requestData.householdId,
            dinnerEventIds: requestData.dinnerEventIds,
            desiredOrders: nextRun ? undefined : requestData.orders,
            userId: nextRun ? undefined : user.id,
            deadlines: adminCorrection ? OPEN_DEADLINES : undefined,
            adminCorrection,
            preview: true
        })

        console.info(`${LOG} Preview complete: ${useBooking().formatScaffoldResult(result)}`)

        setResponseStatus(event, 200)
        return ScaffoldOrdersResponseSchema.parse({
            householdId: requestData.householdId,
            scaffoldResult: result
        })
    } catch (error) {
        return throwH3Error(`${LOG} Error previewing orders for household ${requestData.householdId}`, error)
    }
})
