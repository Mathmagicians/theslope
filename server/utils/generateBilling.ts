import type {D1Database} from '@cloudflare/workers-types'
import {getPrismaClientConnection} from '~~/server/data/allergyRepository'
import {useBilling} from '~/composables/useBilling'
import {chunkArray} from '~/utils/batchUtils'

const LOG = '💰 > BILLING > [GENERATE]'

// ADR-014: Batch sizes for D1 limits
const UPDATE_BATCH_SIZE = 50

export interface BillingGenerationResult {
    billingPeriodSummaryId: number
    billingPeriod: string
    invoiceCount: number
    transactionCount: number
    totalAmount: number
}

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
 * ADR-014 compliant: Uses createManyAndReturn for bulk inserts, batched updates
 * ADR-015 compliant: Idempotent - skips if billing period already exists
 */
export const generateBilling = async (d1Client: D1Database): Promise<BillingGenerationResult | null> => {
    const prisma = await getPrismaClientConnection(d1Client)
    const {calculateClosedBillingPeriod} = useBilling()

    const {dateRange, paymentDate, billingPeriod} = calculateClosedBillingPeriod()
    const periodEnd = dateRange.end

    console.info(`${LOG} Starting billing generation for period ${billingPeriod}`)

    // Idempotent check - skip if period already exists
    const existingPeriod = await prisma.billingPeriodSummary.findUnique({
        where: {billingPeriod}
    })

    if (existingPeriod) {
        console.info(`${LOG} Billing period ${billingPeriod} already exists (id=${existingPeriod.id}), skipping`)
        return null
    }

    // 1. Find all unbilled transactions with household info
    const unbilledTransactions = await prisma.transaction.findMany({
        where: {invoiceId: null},
        include: {
            order: {
                include: {
                    inhabitant: {
                        include: {household: true}
                    }
                }
            }
        }
    })

    console.info(`${LOG} Found ${unbilledTransactions.length} unbilled transactions`)

    // 2. Group transactions by household
    const householdMap = new Map<number, HouseholdBillingData>()

    for (const tx of unbilledTransactions) {
        const household = tx.order?.inhabitant?.household
        if (!household) {
            console.warn(`${LOG} Transaction ${tx.id} has no linked household, skipping`)
            continue
        }

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

    // 3. Create BillingPeriodSummary
    const summary = await prisma.billingPeriodSummary.create({
        data: {
            billingPeriod,
            shareToken: crypto.randomUUID(),
            totalAmount,
            householdCount: householdBillingData.length,
            ticketCount,
            cutoffDate: periodEnd,
            paymentDate
        }
    })

    console.info(`${LOG} Created BillingPeriodSummary id=${summary.id}`)

    // 4. ADR-014: Bulk create invoices with createManyAndReturn
    const invoiceData = householdBillingData.map(h => ({
        householdId: h.householdId,
        pbsId: h.pbsId,
        address: h.address,
        amount: h.totalAmount,
        cutoffDate: periodEnd,
        paymentDate,
        billingPeriod,
        billingPeriodSummaryId: summary.id
    }))

    const createdInvoices = await prisma.invoice.createManyAndReturn({data: invoiceData})

    console.info(`${LOG} Created ${createdInvoices.length} invoices`)

    // 5. ADR-014: Batch update transactions to link to invoices
    // Build invoice lookup by householdId
    const invoiceByHousehold = new Map<number, number>()
    for (const invoice of createdInvoices) {
        if (invoice.householdId) {
            invoiceByHousehold.set(invoice.householdId, invoice.id)
        }
    }

    // Collect all transaction updates
    const transactionUpdates: {txId: number, invoiceId: number}[] = []
    for (const h of householdBillingData) {
        const invoiceId = invoiceByHousehold.get(h.householdId)
        if (invoiceId) {
            for (const txId of h.transactionIds) {
                transactionUpdates.push({txId, invoiceId})
            }
        }
    }

    // ADR-014: Batch updates with Promise.all in chunks
    const chunkUpdates = chunkArray<{txId: number, invoiceId: number}>(UPDATE_BATCH_SIZE)
    const batches = chunkUpdates(transactionUpdates)

    for (const batch of batches) {
        await Promise.all(
            batch.map(({txId, invoiceId}) =>
                prisma.transaction.update({
                    where: {id: txId},
                    data: {invoiceId}
                })
            )
        )
    }

    console.info(`${LOG} Linked ${transactionUpdates.length} transactions to invoices`)

    return {
        billingPeriodSummaryId: summary.id,
        billingPeriod,
        invoiceCount: createdInvoices.length,
        transactionCount: ticketCount,
        totalAmount
    }
}
