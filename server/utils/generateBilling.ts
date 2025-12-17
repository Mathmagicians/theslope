import type {D1Database} from '@cloudflare/workers-types'
import {getPrismaClientConnection} from '~~/server/data/allergyRepository'
import {useBilling} from '~/composables/useBilling'
import {chunkArray} from '~/utils/batchUtils'

const LOG = '💰 > BILLING > [GENERATE]'

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
 * ADR-015 compliant: Idempotent - returns existing period stats if already generated
 */
export const generateBilling = async (d1Client: D1Database): Promise<BillingGenerationResult> => {
    const prisma = await getPrismaClientConnection(d1Client)
    const {calculateClosedBillingPeriod} = useBilling()

    const {dateRange, paymentDate, billingPeriod} = calculateClosedBillingPeriod()
    const periodEnd = dateRange.end

    console.info(`${LOG} Starting billing generation for period ${billingPeriod}`)

    // Idempotent check - return existing period stats if already generated
    const existingPeriod = await prisma.billingPeriodSummary.findUnique({
        where: {billingPeriod}
    })

    if (existingPeriod) {
        console.info(`${LOG} Billing period ${billingPeriod} already exists (id=${existingPeriod.id}), returning existing stats`)
        return {
            billingPeriodSummaryId: existingPeriod.id,
            billingPeriod: existingPeriod.billingPeriod,
            invoiceCount: existingPeriod.householdCount,
            transactionCount: existingPeriod.ticketCount,
            totalAmount: existingPeriod.totalAmount
        }
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

    // 5. ADR-014: Batch update transactions to link to invoices using updateMany
    // Build invoice lookup by householdId
    const invoiceByHousehold = new Map<number, number>()
    for (const invoice of createdInvoices) {
        if (invoice.householdId) {
            invoiceByHousehold.set(invoice.householdId, invoice.id)
        }
    }

    // Group transaction IDs by invoiceId for bulk updates
    const txIdsByInvoice = new Map<number, number[]>()
    for (const h of householdBillingData) {
        const invoiceId = invoiceByHousehold.get(h.householdId)
        if (invoiceId) {
            txIdsByInvoice.set(invoiceId, h.transactionIds)
        }
    }

    // ADR-014: Use updateMany with chunked ID arrays (90 IDs per query to stay under D1's 100 param limit)
    const UPDATEM_BATCH_SIZE = 90
    const chunkIds = chunkArray<number>(UPDATEM_BATCH_SIZE)
    let linkedCount = 0

    for (const [invoiceId, txIds] of txIdsByInvoice) {
        const idBatches = chunkIds(txIds)
        for (const idBatch of idBatches) {
            await prisma.transaction.updateMany({
                where: {id: {in: idBatch}},
                data: {invoiceId}
            })
            linkedCount += idBatch.length
        }
    }

    console.info(`${LOG} Linked ${linkedCount} transactions to invoices`)

    return {
        billingPeriodSummaryId: summary.id,
        billingPeriod,
        invoiceCount: createdInvoices.length,
        transactionCount: ticketCount,
        totalAmount
    }
}
