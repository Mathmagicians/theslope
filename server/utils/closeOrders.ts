import type {D1Database} from "@cloudflare/workers-types"
import {fetchPendingOrdersOnConsumedDinners, updateOrdersToState} from "~~/server/data/financesRepository"
import {useBookingValidation, type CloseOrdersResult} from "~/composables/useBookingValidation"

const LOG = '🎟️ > DAILY > [CLOSE_ORDERS]'

/**
 * Mark all BOOKED and RELEASED orders on CONSUMED dinners in active season as CLOSED.
 * Resilient to missed crons - processes ALL pending orders on consumed dinners.
 *
 * BOOKED = ate the dinner, charged
 * RELEASED = released after deadline but not sold, still charged
 * CANCELLED = dinner was cancelled, not charged (excluded)
 *
 * @returns CloseOrdersResult with count of closed orders
 */
export async function closeOrders(d1Client: D1Database): Promise<CloseOrdersResult> {
    const {chunkIds, OrderStateSchema} = useBookingValidation()

    // Fetch all pending orders from repository
    const pendingOrders = await fetchPendingOrdersOnConsumedDinners(d1Client)

    if (pendingOrders.length === 0) {
        console.info(`${LOG} No pending orders on CONSUMED dinners to close`)
        return { closed: 0 }
    }

    const orderIds = pendingOrders.map(o => o.id)
    console.info(`${LOG} Found ${orderIds.length} pending orders to close`)

    // Batch update to CLOSED via repository
    const batches = chunkIds(orderIds)
    let totalClosed = 0

    for (const batch of batches) {
        const count = await updateOrdersToState(d1Client, batch, OrderStateSchema.enum.CLOSED)
        totalClosed += count
    }

    console.info(`${LOG} Complete: closed=${totalClosed}`)

    return { closed: totalClosed }
}
