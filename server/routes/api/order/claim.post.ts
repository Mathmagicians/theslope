import {createError, defineEventHandler, readValidatedBody, setResponseStatus} from "h3"
import {claimOrder} from "~~/server/data/financesRepository"
import {getRequiredUser, requireHouseholdAccess} from "~~/server/utils/authorizationHelper"
import {fetchInhabitant} from "~~/server/data/prismaRepository"
import type {OrderDetail} from "~/composables/useBookingValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {z} from "zod"

const {throwH3Error} = eventHandlerHelper

const bodySchema = z.object({
    dinnerEventId: z.number().int().positive(),
    ticketPriceId: z.number().int().positive(),
    inhabitantId: z.number().int().positive()
})

/**
 * POST /api/order/claim - Claim a released ticket by ticket type
 *
 * Finds the first RELEASED ticket matching the dinnerEventId and ticketPriceId (FIFO by releasedAt)
 * and claims it for the specified inhabitant.
 *
 * Race-safe: Uses atomic WHERE clause with retry logic (up to 3 attempts).
 * Returns 409 if no matching ticket is available.
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
    let body!: z.infer<typeof bodySchema>
    try {
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

        // Attempt atomic claim with retry logic
        const claimedOrder = await claimOrder(
            d1Client,
            body.dinnerEventId,
            body.ticketPriceId,
            body.inhabitantId,
            user.id
        )

        if (!claimedOrder) {
            throw createError({
                statusCode: 409,
                message: 'No matching ticket available - already claimed or not released'
            })
        }

        console.info(`${LOG} User ${user.id} claimed ticket (dinner=${body.dinnerEventId}, ticketPrice=${body.ticketPriceId}) for inhabitant ${body.inhabitantId}`)
        setResponseStatus(event, 200)
        return claimedOrder
    } catch (error) {
        return throwH3Error(`${LOG} Error claiming ticket`, error)
    }
})
