import type {D1Database} from "@cloudflare/workers-types"
import {fetchClosedOrdersWithoutTransaction, createTransactionsBatch, type TransactionCreateData} from "~~/server/data/financesRepository"
import type {CreateTransactionsResult} from "~/composables/useBookingValidation"
import {useBooking} from "~/composables/useBooking"
import {useBillingValidation} from "~/composables/useBillingValidation"

const LOG = '💰 > DAILY > [CREATE_TRANSACTIONS]'

/**
 * Create transactions for all CLOSED orders in active season that don't have one.
 * Resilient to missed crons - processes ALL pending CLOSED orders.
 *
 * Transaction includes:
 * - orderSnapshot: JSON snapshot with billing-relevant data (ADR-010)
 * - userSnapshot: JSON snapshot of bookedByUser at transaction time
 * - amount: priceAtBooking from order (frozen price)
 * - userEmailHandle: email of bookedByUser
 *
 * @returns CreateTransactionsResult with count of created transactions
 */
export async function createTransactions(d1Client: D1Database): Promise<CreateTransactionsResult> {
    const {chunkTransactions} = useBooking()
    const {serializeTransaction} = useBillingValidation()

    // Fetch all CLOSED orders without transaction from repository
    const closedOrders = await fetchClosedOrdersWithoutTransaction(d1Client)

    if (closedOrders.length === 0) {
        console.info(`${LOG} No CLOSED orders without transactions`)
        return { created: 0 }
    }

    console.info(`${LOG} Found ${closedOrders.length} CLOSED orders without transactions`)

    // Prepare all transaction data using serializeTransaction (ADR-010)
    const transactionData: TransactionCreateData[] = closedOrders.map(order => ({
        orderId: order.id,
        orderSnapshot: serializeTransaction({
            dinnerEvent: order.dinnerEvent,
            inhabitant: order.inhabitant,
            ticketType: order.ticketType
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
