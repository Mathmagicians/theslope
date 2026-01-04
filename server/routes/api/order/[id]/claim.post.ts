import {createError, defineEventHandler, getValidatedRouterParams, readValidatedBody, setResponseStatus} from "h3"
import {claimOrder} from "~~/server/data/financesRepository"
import {getRequiredUser, requireHouseholdAccess} from "~~/server/utils/authorizationHelper"
import {fetchInhabitant} from "~~/server/data/prismaRepository"
import type {OrderDetail} from "~/composables/useBookingValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {z} from "zod"

const {throwH3Error} = eventHandlerHelper

const idSchema = z.object({
    id: z.number({coerce: true}).positive().int()
})

const bodySchema = z.object({
    inhabitantId: z.number().int().positive()
})

/**
 * POST /api/order/[id]/claim - Claim a released ticket
 *
 * Allows a user to claim a RELEASED ticket for an inhabitant in their household.
 * Original ticket price is preserved (priceAtBooking unchanged).
 *
 * Race-safe: Uses atomic WHERE clause so concurrent claims fail gracefully.
 *
 * ADR-002: Separate validation vs business logic error handling
 * ADR-009: Returns OrderDetail
 * ADR-011: Creates USER_CLAIMED audit entry with original household provenance
 */
export default defineEventHandler(async (event): Promise<OrderDetail> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    const LOG = '🎟️ > ORDER > [CLAIM]'

    // Input validation (ADR-002)
    let orderId!: number
    let body!: z.infer<typeof bodySchema>
    try {
        const params = await getValidatedRouterParams(event, idSchema.parse)
        orderId = params.id
        body = await readValidatedBody(event, bodySchema.parse)
    } catch (error) {
        return throwH3Error(`${LOG} Input validation error`, error, 400)
    }

    // Get authenticated user (throws 401 if not authenticated)
    const user = await getRequiredUser(event)

    // Business logic (ADR-002)
    try {
        // Verify inhabitant exists and belongs to user's household
        const inhabitant = await fetchInhabitant(d1Client, body.inhabitantId)
        if (!inhabitant) {
            throw createError({statusCode: 404, message: `Inhabitant ${body.inhabitantId} not found`})
        }

        // Authorization: User must belong to the inhabitant's household
        await requireHouseholdAccess(event, inhabitant.householdId)

        // Attempt atomic claim
        const claimedOrder = await claimOrder(d1Client, orderId, body.inhabitantId, user.id)

        if (!claimedOrder) {
            // Race condition or order not available
            throw createError({
                statusCode: 409,
                message: 'Ticket not available - already claimed or not released'
            })
        }

        console.info(`${LOG} User ${user.id} claimed order ${orderId} for inhabitant ${body.inhabitantId}`)
        setResponseStatus(event, 200)
        return claimedOrder
    } catch (error) {
        return throwH3Error(`${LOG} Error claiming order ${orderId}`, error)
    }
})
