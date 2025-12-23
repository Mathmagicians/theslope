import type {D1Database} from "@cloudflare/workers-types"
import {fetchClosedOrdersWithoutTransaction, createTransactionsBatch} from "~~/server/data/financesRepository"
import type {CreateTransactionsResult} from "~/composables/useBookingValidation"
import {useBooking} from "~/composables/useBooking"

const LOG = '💰 > DAILY > [CREATE_TRANSACTIONS]'

/**
 * Create transactions for all CLOSED orders in active season that don't have one.
 * Resilient to missed crons - processes ALL pending CLOSED orders.
 */
export async function createTransactions(d1Client: D1Database): Promise<CreateTransactionsResult> {
    const {chunkTransactions, prepareTransactionData} = useBooking()

    const closedOrders = await fetchClosedOrdersWithoutTransaction(d1Client)

    if (closedOrders.length === 0) {
        console.info(`${LOG} No CLOSED orders without transactions`)
        return {created: 0}
    }

    console.info(`${LOG} Found ${closedOrders.length} CLOSED orders without transactions`)

    const transactionData = prepareTransactionData(closedOrders)

    const batches = chunkTransactions(transactionData)
    let totalCreated = 0

    for (const batch of batches) {
        const count = await createTransactionsBatch(d1Client, batch)
        totalCreated += count
    }

    console.info(`${LOG} Complete: created=${totalCreated}`)

    return {created: totalCreated}
}
