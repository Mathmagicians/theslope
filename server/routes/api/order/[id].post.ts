import {createError, defineEventHandler, getValidatedRouterParams, readValidatedBody, setResponseStatus} from "h3"
import {fetchOrder, updateOrder, deleteOrder} from "~~/server/data/financesRepository"
import {fetchSeason} from "~~/server/data/prismaRepository"
import {requireHouseholdAccess} from "~~/server/utils/authorizationHelper"
import type {OrderDetail} from "~/composables/useBookingValidation"
import {useBookingValidation} from "~/composables/useBookingValidation"
import {useSeason} from "~/composables/useSeason"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {z} from "zod"

const {throwH3Error, getSessionUserId} = eventHandlerHelper

const idSchema = z.object({
    id: z.number({coerce: true}).positive().int()
})

/**
 * POST /api/order/[id] - Update order dinnerMode
 *
 * User-facing endpoint for changing dinner mode preference (DINEIN, TAKEAWAY, etc.)
 *
 * Cancellation behavior (dinnerMode → NONE):
 * - Before cancellation deadline: DELETE order (user not charged, audit preserved)
 * - After cancellation deadline: RELEASE order (user pays, ticket available to others)
 *
 * Regular mode changes (not NONE): UPDATE order with new dinnerMode
 *
 * ADR-002: Separate validation vs business logic error handling
 * ADR-009: Returns OrderDetail
 * ADR-011: Creates audit trail for all mutations
 */
export default defineEventHandler(async (event): Promise<OrderDetail> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    const {DinnerModeSchema, OrderAuditActionSchema, OrderStateSchema} = useBookingValidation()
    const {deadlinesForSeason} = useSeason()
    const DinnerMode = DinnerModeSchema.enum
    const OrderAuditAction = OrderAuditActionSchema.enum
    const OrderState = OrderStateSchema.enum
    const LOG = '🎟️ > ORDER > [POST]'

    // Input validation schema
    const UpdateOrderBodySchema = z.object({
        dinnerMode: DinnerModeSchema
    })

    // Input validation (ADR-002)
    let id!: number
    let body!: z.infer<typeof UpdateOrderBodySchema>
    try {
        const params = await getValidatedRouterParams(event, idSchema.parse)
        id = params.id
        body = await readValidatedBody(event, UpdateOrderBodySchema.parse)
    } catch (error) {
        console.error(`${LOG} Input validation error:`, error)
        throw createError({
            statusCode: 400,
            message: 'Invalid input data',
            cause: error
        })
    }

    // Get authenticated user ID for audit trail
    const performedByUserId = await getSessionUserId(event)

    // Business logic (ADR-002)
    try {
        // Fetch order to get dinner event date for deadline check
        const existingOrder = await fetchOrder(d1Client, id)
        if (!existingOrder) {
            throw createError({statusCode: 404, message: `Order ${id} not found`})
        }

        // Authorization: User must belong to the order's household
        await requireHouseholdAccess(event, existingOrder.inhabitant.householdId)

        // Get season for deadline calculation
        const season = await fetchSeason(d1Client, existingOrder.dinnerEvent.seasonId!)
        if (!season) {
            throw createError({statusCode: 404, message: `Season not found for order ${id}`})
        }
        const {getOrderCancellationAction} = deadlinesForSeason(season)

        const isCancellation = body.dinnerMode === DinnerMode.NONE

        // Handle cancellation (dinnerMode → NONE)
        if (isCancellation) {
            const cancellationAction = getOrderCancellationAction(existingOrder.dinnerEvent.date)

            if (cancellationAction === null) {
                // Before deadline: DELETE order (user not charged)
                console.info(`${LOG} Cancelling order ${id} BEFORE deadline - deleting`)
                await deleteOrder(d1Client, id, performedByUserId)

                // Return the order with updated dinnerMode to indicate final state
                setResponseStatus(event, 200)
                return {...existingOrder, dinnerMode: DinnerMode.NONE}
            } else {
                // After deadline: RELEASE order (user pays, ticket available)
                console.info(`${LOG} Cancelling order ${id} AFTER deadline - releasing`)
                const updatedOrder = await updateOrder(d1Client, id, cancellationAction.updates, {
                    action: cancellationAction.auditAction,
                    performedByUserId
                })

                setResponseStatus(event, 200)
                return updatedOrder
            }
        }

        // Regular mode change (not cancellation)
        // If order was RELEASED, re-book it (restore BOOKED state, clear releasedAt)
        const isRebooking = existingOrder.state === OrderState.RELEASED
        const updates = isRebooking
            ? {dinnerMode: body.dinnerMode, state: OrderState.BOOKED, releasedAt: null}
            : {dinnerMode: body.dinnerMode}

        console.info(`${LOG} ${isRebooking ? 'Re-booking' : 'Updating'} order ${id} dinnerMode to ${body.dinnerMode}`)
        const updatedOrder = await updateOrder(d1Client, id, updates, {
            action: OrderAuditAction.USER_BOOKED,
            performedByUserId
        })

        setResponseStatus(event, 200)
        return updatedOrder
    } catch (error) {
        return throwH3Error(`${LOG} Error updating order ${id}`, error)
    }
})
