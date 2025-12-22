import type {D1Database} from '@cloudflare/workers-types'
import {
    fetchBillingPeriodSummary,
    fetchUnbilledTransactions,
    fetchInvoicesForBillingPeriod,
    createBillingPeriodSummary,
    createInvoices,
    linkTransactionsToInvoice
} from '~~/server/data/financesRepository'
import {useBilling} from '~/composables/useBilling'
import type {BillingGenerationResult, InvoiceCreate, TransactionDisplay} from '~/composables/useBillingValidation'

const LOG = '💰 > BILLING > [GENERATE]'

interface HouseholdBillingData {
    householdId: number | null  // null if household deleted (id=0 in snapshot)
    pbsId: number               // unique billing identifier (always valid from snapshot)
    address: string
    transactionIds: number[]
    totalAmount: number
}

interface PeriodBillingData {
    billingPeriod: string
    paymentDate: Date
    cutoffDate: Date
    transactions: TransactionDisplay[]
}

/**
 * Generate monthly billing - creates Invoice and BillingPeriodSummary from unbilled Transactions
 *
 * ADR-014: Uses repository functions, chunker from composable
 * ADR-015: Idempotent - resilient to partial failures, safe to re-run
 *
 * Multi-period support: Groups transactions by their actual billing period (based on dinner date)
 * and processes each period separately. Returns array of results (one per period).
 *
 * Reconciliation pattern (like daily maintenance):
 * 1. Fetch unbilled transactions and group by billing period
 * 2. For each period: get or create BillingPeriodSummary
 * 3. Group transactions by household
 * 4. Fetch existing invoices to know which households are already billed
 * 5. Create invoices only for households without one
 * 6. Link remaining unbilled transactions
 */
export const generateBilling = async (d1Client: D1Database): Promise<BillingGenerationResult[]> => {
    const {getBillingPeriodForDate, calculateClosedBillingPeriod, chunkTransactionIds} = useBilling()

    // Calculate cutoff date (end of last closed billing period)
    const {dateRange: closedPeriod} = calculateClosedBillingPeriod()
    const cutoffDate = closedPeriod.end

    // Fetch unbilled transactions up to cutoff (only closed periods)
    const unbilledTransactions = await fetchUnbilledTransactions(d1Client, cutoffDate)

    if (unbilledTransactions.length === 0) {
        console.info(`${LOG} No unbilled transactions up to ${cutoffDate.toISOString().split('T')[0]}`)
        return []
    }

    console.info(`${LOG} Found ${unbilledTransactions.length} unbilled transactions up to ${cutoffDate.toISOString().split('T')[0]}`)

    // Group transactions by billing period (based on dinner date)
    const periodMap = new Map<string, PeriodBillingData>()

    for (const tx of unbilledTransactions) {
        const dinnerDate = new Date(tx.dinnerEvent.date)
        const {billingPeriod, paymentDate, dateRange} = getBillingPeriodForDate(dinnerDate)

        if (!periodMap.has(billingPeriod)) {
            periodMap.set(billingPeriod, {
                billingPeriod,
                paymentDate,
                cutoffDate: dateRange.end,
                transactions: []
            })
        }

        periodMap.get(billingPeriod)!.transactions.push(tx)
    }

    const periods = Array.from(periodMap.values())
        .sort((a, b) => a.billingPeriod.localeCompare(b.billingPeriod)) // Process oldest first

    console.info(`${LOG} Grouped into ${periods.length} billing period(s)`)

    // Process each billing period
    const results: BillingGenerationResult[] = []

    for (const period of periods) {
        const result = await processBillingPeriod(d1Client, period, chunkTransactionIds)
        results.push(result)
    }

    return results
}

/**
 * Process a single billing period - creates summary, invoices, and links transactions
 */
async function processBillingPeriod(
    d1Client: D1Database,
    period: PeriodBillingData,
    chunkTransactionIds: (ids: number[]) => number[][]
): Promise<BillingGenerationResult> {
    const {billingPeriod, paymentDate, cutoffDate, transactions} = period

    console.info(`${LOG} Processing period ${billingPeriod}: ${transactions.length} transactions`)

    // Group transactions by pbsId (unique billing identifier, stable even if household deleted)
    const householdMap = new Map<number, HouseholdBillingData>()

    for (const tx of transactions) {
        const household = tx.inhabitant.household
        if (!householdMap.has(household.pbsId)) {
            householdMap.set(household.pbsId, {
                householdId: household.id > 0 ? household.id : null,  // null if deleted
                pbsId: household.pbsId,
                address: household.address,
                transactionIds: [],
                totalAmount: 0
            })
        }

        const data = householdMap.get(household.pbsId)!
        data.transactionIds.push(tx.id)
        data.totalAmount += tx.amount
    }

    const householdBillingData = Array.from(householdMap.values())
    const totalAmount = householdBillingData.reduce((sum, h) => sum + h.totalAmount, 0)
    const ticketCount = transactions.length

    // Get or create BillingPeriodSummary
    let summaryId: number
    const existingSummary = await fetchBillingPeriodSummary(d1Client, billingPeriod)

    if (existingSummary) {
        summaryId = existingSummary.id
        console.info(`${LOG} Using existing BillingPeriodSummary id=${summaryId}`)
    } else {
        const created = await createBillingPeriodSummary(d1Client, {
            billingPeriod,
            totalAmount,
            householdCount: householdBillingData.length,
            ticketCount,
            cutoffDate,
            paymentDate
        })
        summaryId = created.id
        console.info(`${LOG} Created BillingPeriodSummary id=${summaryId}`)
    }

    // Fetch existing invoices and build lookup by pbsId (stable even if household deleted)
    const existingInvoices = await fetchInvoicesForBillingPeriod(d1Client, summaryId)
    const invoiceByPbsId = new Map<number, number>()
    for (const inv of existingInvoices) {
        invoiceByPbsId.set(inv.pbsId, inv.id)
    }

    // Create invoices only for pbsIds that don't have one yet
    const householdsNeedingInvoice = householdBillingData.filter(h => !invoiceByPbsId.has(h.pbsId))

    if (householdsNeedingInvoice.length > 0) {
        const invoiceData: InvoiceCreate[] = householdsNeedingInvoice.map(h => ({
            householdId: h.householdId,  // null if household deleted
            pbsId: h.pbsId,
            address: h.address,
            amount: h.totalAmount,
            cutoffDate,
            paymentDate,
            billingPeriod,
            billingPeriodSummaryId: summaryId
        }))

        const createdInvoices = await createInvoices(d1Client, invoiceData)

        for (const invoice of createdInvoices) {
            invoiceByPbsId.set(invoice.pbsId, invoice.id)
        }
        console.info(`${LOG} Created ${createdInvoices.length} new invoices for period ${billingPeriod}`)
    }

    // Link unbilled transactions to their invoices (chunked for D1 limits)
    let linkedCount = 0

    for (const h of householdBillingData) {
        const invoiceId = invoiceByPbsId.get(h.pbsId)
        if (!invoiceId) continue

        const batches = chunkTransactionIds(h.transactionIds)
        for (const batch of batches) {
            const count = await linkTransactionsToInvoice(d1Client, invoiceId, batch)
            linkedCount += count
        }
    }

    console.info(`${LOG} Period ${billingPeriod}: linked ${linkedCount} transactions, ${invoiceByPbsId.size} invoices`)

    return {
        billingPeriodSummaryId: summaryId,
        billingPeriod,
        invoiceCount: invoiceByPbsId.size,
        transactionCount: ticketCount,
        totalAmount
    }
}
