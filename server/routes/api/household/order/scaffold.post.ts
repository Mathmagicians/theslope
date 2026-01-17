import {defineEventHandler, readValidatedBody, setResponseStatus} from "h3"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {requireHouseholdAccess} from "~~/server/utils/authorizationHelper"
import {useBookingValidation, type ScaffoldOrdersRequest, type ScaffoldOrdersResponse} from "~/composables/useBookingValidation"
import {scaffoldPrebookings} from "~~/server/utils/scaffoldPrebookings"

const {throwH3Error} = eventHandlerHelper

const LOG = '🎟️ > HOUSEHOLD > [SCAFFOLD]'

/**
 * POST /api/household/order/scaffold
 * Unified booking mutation for household dinner orders (ADR-016)
 *
 * Replaces direct order mutations with scaffold-based approach:
 * - Creates new orders from desiredOrders
 * - Updates existing orders (mode changes, price changes)
 * - Deletes orders when NONE before deadline
 * - Releases orders when NONE after deadline
 *
 * Requires: authenticated user belongs to the household
 */
export default defineEventHandler<Promise<ScaffoldOrdersResponse>>(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    const {ScaffoldOrdersRequestSchema, ScaffoldOrdersResponseSchema} = useBookingValidation()

    // Input validation (ADR-002)
    let requestData!: ScaffoldOrdersRequest
    try {
        requestData = await readValidatedBody(event, ScaffoldOrdersRequestSchema.parse)
    } catch (error) {
        return throwH3Error(`${LOG} Input validation error`, error)
    }

    // Authorization: verify user belongs to household
    const user = await requireHouseholdAccess(event, requestData.householdId)

    // Business logic (ADR-002)
    try {
        console.info(`${LOG} User ${user.email} scaffolding ${requestData.orders.length} orders for household ${requestData.householdId}`)

        // Call scaffoldPrebookings in user mode
        const result = await scaffoldPrebookings(d1Client, {
            seasonId: requestData.seasonId,
            householdId: requestData.householdId,
            dinnerEventIds: requestData.dinnerEventIds,
            desiredOrders: requestData.orders,
            userId: user.id
        })

        console.info(`${LOG} Scaffold complete: created=${result.created}, deleted=${result.deleted}, released=${result.released}`)

        setResponseStatus(event, 200)
        return ScaffoldOrdersResponseSchema.parse({
            householdId: requestData.householdId,
            scaffoldResult: result
        })
    } catch (error) {
        return throwH3Error(`${LOG} Error scaffolding orders for household ${requestData.householdId}`, error)
    }
})
