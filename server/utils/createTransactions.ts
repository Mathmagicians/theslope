import type {D1Database} from "@cloudflare/workers-types"
import {fetchClosedOrdersWithoutTransaction, createTransactionsBatch, type TransactionCreateData} from "~~/server/data/financesRepository"
import type {CreateTransactionsResult} from "~/composables/useBookingValidation"
import {useBooking} from "~/composables/useBooking"

const LOG = '💰 > DAILY > [CREATE_TRANSACTIONS]'

/**
 * Create transactions for all CLOSED orders in active season that don't have one.
 * Resilient to missed crons - processes ALL pending CLOSED orders.
 *
 * Transaction includes:
 * - orderSnapshot: JSON snapshot of order at transaction time
 * - userSnapshot: JSON snapshot of bookedByUser at transaction time
 * - amount: priceAtBooking from order
 * - userEmailHandle: email of bookedByUser
 *
 * @returns CreateTransactionsResult with count of created transactions
 */
export async function createTransactions(d1Client: D1Database): Promise<CreateTransactionsResult> {
    const {chunkTransactions} = useBooking()

    // Fetch all CLOSED orders without transaction from repository
    const closedOrders = await fetchClosedOrdersWithoutTransaction(d1Client)

    if (closedOrders.length === 0) {
        console.info(`${LOG} No CLOSED orders without transactions`)
        return { created: 0 }
    }

    console.info(`${LOG} Found ${closedOrders.length} CLOSED orders without transactions`)

    // Prepare all transaction data
    const transactionData: TransactionCreateData[] = closedOrders.map(order => ({
        orderId: order.id,
        orderSnapshot: JSON.stringify({
            id: order.id,
            dinnerEventId: order.dinnerEventId,
            inhabitantId: order.inhabitantId,
            bookedByUserId: order.bookedByUserId,
            ticketType: order.ticketPrice.ticketType,
            priceAtBooking: order.priceAtBooking,
            dinnerMode: order.dinnerMode,
            state: order.state,
            closedAt: order.closedAt,
            dinnerEvent: order.dinnerEvent,
            inhabitant: order.inhabitant
        }),
        userSnapshot: JSON.stringify(order.bookedByUser || { id: null, email: 'unknown' }),
        amount: order.priceAtBooking,
        userEmailHandle: order.bookedByUser?.email || 'unknown'
    }))

    // Batch create via repository
    const batches = chunkTransactions(transactionData)
    let totalCreated = 0

    for (const batch of batches) {
        const count = await createTransactionsBatch(d1Client, batch)
        totalCreated += count
    }

    console.info(`${LOG} Complete: created=${totalCreated}`)

    return { created: totalCreated }
}
