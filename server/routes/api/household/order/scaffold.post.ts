import {defineEventHandler, readValidatedBody, getValidatedQuery, setResponseStatus} from "h3"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {requireHouseholdAccess} from "~~/server/utils/authorizationHelper"
import {isAdmin} from '~/composables/usePermissions'
import {useBookingValidation, type ScaffoldOrdersRequest, type ScaffoldOrdersResponse} from "~/composables/useBookingValidation"
import {scaffoldPrebookings} from "~~/server/utils/scaffoldPrebookings"
import {emailChannel} from "~~/server/utils/sender/config"
import {AdminBypassQuerySchema} from '~/composables/useCoreValidation'
import {OPEN_DEADLINES} from '~/composables/useSeason'

const {throwH3Error} = eventHandlerHelper

const LOG = '🎟️ > HOUSEHOLD > [SCAFFOLD]'

/**
 * POST /api/household/order/scaffold
 * The one member booking write for household dinner orders (ADR-016)
 *
 * - Creates new orders before the deadline
 * - After the deadline claims a released ticket at the price, else queues the wish and reports its position
 * - Updates existing orders (mode changes, price changes)
 * - Deletes orders when NONE before deadline, releases them after it (the ticket goes to the queue head when it fits)
 * - Leaves the queue on NONE for an entry, rewrites the entry's wish on another mode or price
 * - `?adminBypass=true` from an admin: any household, and the deadlines lift (the admin correction)
 *
 * Requires: authenticated user belongs to the household
 */
export default defineEventHandler<Promise<ScaffoldOrdersResponse>>(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    const {ScaffoldOrdersRequestSchema, ScaffoldOrdersResponseSchema} = useBookingValidation()

    // Input validation (ADR-002)
    let requestData!: ScaffoldOrdersRequest
    let adminBypass!: boolean
    try {
        requestData = await readValidatedBody(event, ScaffoldOrdersRequestSchema.parse)
        adminBypass = (await getValidatedQuery(event, AdminBypassQuerySchema.parse)).adminBypass
    } catch (error) {
        return throwH3Error(`${LOG} Input validation error`, error)
    }

    // Authorization: verify user belongs to household (admin can bypass via ?adminBypass=true)
    const user = await requireHouseholdAccess(event, requestData.householdId, adminBypass ? isAdmin : undefined)

    // Business logic (ADR-002)
    try {
        console.info(`${LOG} User ${user.email} scaffolding ${requestData.orders.length} orders for household ${requestData.householdId}`)

        // Call scaffoldPrebookings in user mode
        const result = await scaffoldPrebookings(d1Client, {
            seasonId: requestData.seasonId,
            householdId: requestData.householdId,
            dinnerEventIds: requestData.dinnerEventIds,
            desiredOrders: requestData.orders,
            userId: user.id,
            deadlines: adminBypass && isAdmin(user) ? OPEN_DEADLINES : undefined,
            email: emailChannel(event.context.cloudflare.env)
        })

        console.info(`${LOG} Scaffold complete: created=${result.created}, deleted=${result.deleted}, released=${result.released}, claimed=${result.claimed}, queued=${result.queued}, left=${result.left}, requeued=${result.requeued}`)

        setResponseStatus(event, 200)
        return ScaffoldOrdersResponseSchema.parse({
            householdId: requestData.householdId,
            scaffoldResult: result
        })
    } catch (error) {
        return throwH3Error(`${LOG} Error scaffolding orders for household ${requestData.householdId}`, error)
    }
})
