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
import type {BillingGenerationResult, InvoiceCreate} from '~/composables/useBillingValidation'

const LOG = '💰 > BILLING > [GENERATE]'

interface HouseholdBillingData {
    householdId: number
    pbsId: number
    address: string
    transactionIds: number[]
    totalAmount: number
}

/**
 * Generate monthly billing - creates Invoice and BillingPeriodSummary from unbilled Transactions
 *
 * ADR-014: Uses repository functions, chunker from composable
 * ADR-015: Idempotent - resilient to partial failures, safe to re-run
 *
 * Reconciliation pattern (like daily maintenance):
 * 1. Get or create BillingPeriodSummary
 * 2. Fetch existing invoices to know which households are already billed
 * 3. Fetch unbilled transactions (naturally excludes already-linked)
 * 4. Create invoices only for households without one
 * 5. Link remaining unbilled transactions
 */
export const generateBilling = async (d1Client: D1Database): Promise<BillingGenerationResult> => {
    const {calculateClosedBillingPeriod, chunkTransactionIds} = useBilling()

    const {dateRange, paymentDate, billingPeriod} = calculateClosedBillingPeriod()
    const periodEnd = dateRange.end

    console.info(`${LOG} Starting billing generation for period ${billingPeriod}`)

    // 1. Check if BillingPeriodSummary exists
    const existingSummary = await fetchBillingPeriodSummary(d1Client, billingPeriod)

    // 2. Fetch unbilled transactions (only returns transactions where invoiceId IS NULL)
    const unbilledTransactions = await fetchUnbilledTransactions(d1Client)

    if (unbilledTransactions.length === 0 && existingSummary) {
        console.info(`${LOG} No unbilled transactions, billing period ${billingPeriod} complete`)
        return {
            billingPeriodSummaryId: existingSummary.id,
            billingPeriod: existingSummary.billingPeriod,
            invoiceCount: existingSummary.householdCount,
            transactionCount: existingSummary.ticketCount,
            totalAmount: existingSummary.totalAmount
        }
    }

    // 3. Filter out orphaned transactions (where order was deleted but transaction remains)
    // Orphaned transactions have fallback householdId: 0 which doesn't exist
    const validTransactions = unbilledTransactions.filter(tx => tx.inhabitant.household.id > 0)
    const orphanedCount = unbilledTransactions.length - validTransactions.length
    if (orphanedCount > 0) {
        console.warn(`${LOG} Skipping ${orphanedCount} orphaned transactions (household deleted)`)
    }
    console.info(`${LOG} Found ${validTransactions.length} valid unbilled transactions`)

    // 4. Group transactions by household
    const householdMap = new Map<number, HouseholdBillingData>()

    for (const tx of validTransactions) {
        const household = tx.inhabitant.household
        if (!householdMap.has(household.id)) {
            householdMap.set(household.id, {
                householdId: household.id,
                pbsId: household.pbsId,
                address: household.address,
                transactionIds: [],
                totalAmount: 0
            })
        }

        const data = householdMap.get(household.id)!
        data.transactionIds.push(tx.id)
        data.totalAmount += tx.amount
    }

    const householdBillingData = Array.from(householdMap.values())
    const totalAmount = householdBillingData.reduce((sum, h) => sum + h.totalAmount, 0)
    const ticketCount = unbilledTransactions.length

    console.info(`${LOG} Grouped into ${householdBillingData.length} households`)

    // 4. Get or create summary ID
    let summaryId: number
    if (existingSummary) {
        summaryId = existingSummary.id
        console.info(`${LOG} Using existing BillingPeriodSummary id=${summaryId}`)
    } else {
        const created = await createBillingPeriodSummary(d1Client, {
            billingPeriod,
            totalAmount,
            householdCount: householdBillingData.length,
            ticketCount,
            cutoffDate: periodEnd,
            paymentDate
        })
        summaryId = created.id
        console.info(`${LOG} Created BillingPeriodSummary id=${summaryId}`)
    }

    // 5. Fetch existing invoices and build lookup by householdId
    const existingInvoices = await fetchInvoicesForBillingPeriod(d1Client, summaryId)
    const invoiceByHousehold = new Map<number, number>()
    for (const inv of existingInvoices) {
        if (inv.householdId) {
            invoiceByHousehold.set(inv.householdId, inv.id)
        }
    }
    console.info(`${LOG} Found ${existingInvoices.length} existing invoices`)

    // 6. Create invoices only for households that don't have one yet
    const householdsNeedingInvoice = householdBillingData.filter(h => !invoiceByHousehold.has(h.householdId))

    if (householdsNeedingInvoice.length > 0) {
        const invoiceData: InvoiceCreate[] = householdsNeedingInvoice.map(h => ({
            householdId: h.householdId,
            pbsId: h.pbsId,
            address: h.address,
            amount: h.totalAmount,
            cutoffDate: periodEnd,
            paymentDate,
            billingPeriod,
            billingPeriodSummaryId: summaryId
        }))

        const createdInvoices = await createInvoices(d1Client, invoiceData)

        for (const invoice of createdInvoices) {
            if (invoice.householdId) {
                invoiceByHousehold.set(invoice.householdId, invoice.id)
            }
        }
        console.info(`${LOG} Created ${createdInvoices.length} new invoices`)
    }

    // 7. Link unbilled transactions to their invoices (chunked for D1 limits)
    let linkedCount = 0

    for (const h of householdBillingData) {
        const invoiceId = invoiceByHousehold.get(h.householdId)
        if (!invoiceId) continue

        const batches = chunkTransactionIds(h.transactionIds)
        for (const batch of batches) {
            const count = await linkTransactionsToInvoice(d1Client, invoiceId, batch)
            linkedCount += count
        }
    }

    console.info(`${LOG} Linked ${linkedCount} transactions to invoices`)

    return {
        billingPeriodSummaryId: summaryId,
        billingPeriod,
        invoiceCount: invoiceByHousehold.size,
        transactionCount: ticketCount,
        totalAmount
    }
}
