import {defineEventHandler, readValidatedBody, getValidatedQuery, setResponseStatus} from "h3"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {requireHouseholdAccess} from "~~/server/utils/authorizationHelper"
import {isAdmin} from '~/composables/usePermissions'
import {useBookingValidation, type ScaffoldOrdersRequest, type ScaffoldOrdersResponse} from "~/composables/useBookingValidation"
import {scaffoldPrebookings} from "~~/server/utils/scaffoldPrebookings"
import {useBooking} from "~/composables/useBooking"
import {emailChannel} from "~~/server/utils/sender/config"
import {notifyBookingOutcomes} from "~~/server/utils/sender/events/waitlist"
import {AdminBypassQuerySchema, QueryFlagSchema} from '~/composables/useCoreValidation'
import {OPEN_DEADLINES} from '~/composables/useSeason'

const {throwH3Error} = eventHandlerHelper

const LOG = '🎟️ > HOUSEHOLD > [SCAFFOLD]'

const querySchema = AdminBypassQuerySchema.extend({preview: QueryFlagSchema})

/**
 * POST /api/household/order/scaffold
 * The one household booking write for household dinner orders (ADR-016)
 *
 * - Creates new orders before the deadline
 * - After the deadline claims a released ticket at the price, else queues the wish and reports its position
 * - Updates existing orders (mode changes, price changes)
 * - Deletes orders when NONE before deadline, releases them after it (the ticket goes to the queue head when it fits)
 * - Leaves the queue on NONE for an entry, rewrites the entry's wish on another mode or price
 * - `?adminBypass=true` from an admin: any household, and the deadlines lift (the admin correction)
 * - `?preview=true`: the reply the save would give, settled against the tickets for sale and the waiting list as they
 *   stand; nothing is written and no mail goes out. Combines with `?adminBypass=true`. With no orders it answers the
 *   household's next run on the dinners asked: the bookings its preferences make there
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
    let preview!: boolean
    try {
        requestData = await readValidatedBody(event, ScaffoldOrdersRequestSchema.parse)
        const query = await getValidatedQuery(event, querySchema.parse)
        adminBypass = query.adminBypass
        preview = query.preview
    } catch (error) {
        return throwH3Error(`${LOG} Input validation error`, error)
    }

    // Authorization: verify user belongs to household (admin can bypass via ?adminBypass=true)
    const user = await requireHouseholdAccess(event, requestData.householdId, adminBypass ? isAdmin : undefined)

    // Business logic (ADR-002)
    try {
        console.info(`${LOG} User ${user.email} ${preview ? 'previewing' : 'scaffolding'} ${requestData.orders.length} orders for household ${requestData.householdId}`)

        // User mode on the orders; an empty draft's preview runs system mode, as the household's next run would
        const nextRun = preview && requestData.orders.length === 0
        const result = await scaffoldPrebookings(d1Client, {
            seasonId: requestData.seasonId,
            householdId: requestData.householdId,
            dinnerEventIds: requestData.dinnerEventIds,
            desiredOrders: nextRun ? undefined : requestData.orders,
            userId: nextRun ? undefined : user.id,
            deadlines: adminBypass && isAdmin(user) ? OPEN_DEADLINES : undefined,
            preview
        })
        if (!preview) await notifyBookingOutcomes(d1Client, emailChannel(cloudflare.env), result.outcomes)

        console.info(`${LOG} Scaffold complete: ${useBooking().formatScaffoldResult(result)}`)

        setResponseStatus(event, 200)
        return ScaffoldOrdersResponseSchema.parse({
            householdId: requestData.householdId,
            scaffoldResult: result
        })
    } catch (error) {
        return throwH3Error(`${LOG} Error scaffolding orders for household ${requestData.householdId}`, error)
    }
})
