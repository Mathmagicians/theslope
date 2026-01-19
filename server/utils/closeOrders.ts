import type {D1Database} from "@cloudflare/workers-types"
import {fetchPendingOrdersOnConsumedDinners, updateOrdersBatch, type OrderBatchUpdate} from "~~/server/data/financesRepository"
import {useBookingValidation, type CloseOrdersResult} from "~/composables/useBookingValidation"
import {getSystemUserId} from "~~/server/utils/systemUser"

const LOG = '🎟️ > DAILY > [CLOSE_ORDERS]'

/**
 * Mark all BOOKED and RELEASED orders on CONSUMED dinners in active season as CLOSED.
 * Resilient to missed crons - processes ALL pending orders on consumed dinners.
 *
 * BOOKED = ate the dinner, charged
 * RELEASED = released after deadline but not sold, still charged
 * CANCELLED = dinner was cancelled, not charged (excluded)
 *
 * ADR-011: Creates SYSTEM_CLOSED audit entries for all closed orders
 *
 * @returns CloseOrdersResult with count of closed orders
 */
export async function closeOrders(d1Client: D1Database): Promise<CloseOrdersResult> {
    const {OrderStateSchema, OrderAuditActionSchema, DinnerModeSchema} = useBookingValidation()

    // Get system user for audit trail (ADR-013: system operations use cached admin user)
    const systemUserId = await getSystemUserId(d1Client)

    // Fetch all pending orders from repository (includes dinnerEventId, seasonId for audit)
    const pendingOrders = await fetchPendingOrdersOnConsumedDinners(d1Client)

    if (pendingOrders.length === 0) {
        console.info(`${LOG} No pending orders on CONSUMED dinners to close`)
        return { closed: 0 }
    }

    console.info(`${LOG} Found ${pendingOrders.length} pending orders to close`)

    // Build batch updates with audit context
    const updates: OrderBatchUpdate[] = pendingOrders.map(order => ({
        orderId: order.id,
        state: OrderStateSchema.enum.CLOSED,
        dinnerMode: DinnerModeSchema.enum.DINEIN, // Preserve existing mode - not actually changing
        ticketPriceId: null, // No change
        priceAtBooking: null, // No change
        isNewRelease: false,
        audit: {
            action: OrderAuditActionSchema.enum.SYSTEM_UPDATED,
            performedByUserId: systemUserId,
            inhabitantId: order.inhabitantId,
            dinnerEventId: order.dinnerEventId,
            seasonId: order.seasonId
        }
    }))

    // Use updateOrdersBatch with audit trail
    const executeBatch = updateOrdersBatch()
    const totalClosed = await executeBatch(d1Client, updates)

    console.info(`${LOG} Complete: closed=${totalClosed}`)

    return { closed: totalClosed }
}
