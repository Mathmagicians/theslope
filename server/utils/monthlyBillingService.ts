/**
 * Monthly Billing Service
 *
 * Core logic for monthly billing generation, called by both:
 * - Nitro scheduled task (context.cloudflare.env)
 * - HTTP endpoint (event.context.cloudflare.env)
 *
 * ADR-014 compliant: Uses createManyAndReturn for bulk inserts
 * ADR-015 compliant: Idempotent - skips if billing period already exists
 *
 * Multi-period support: Processes ALL unbilled transactions, grouping by
 * actual billing period (based on dinner date). Handles catch-up scenarios.
 *
 * Per closed period, after generation: the CSV is archived to R2 and the accountant mail is queued
 * (BILLING_PERIOD_CLOSED). Both are side effects that report, never throw — billing success stands alone.
 */
import {generateBilling} from '~~/server/utils/generateBilling'
import {createJobRun, completeJobRun} from '~~/server/data/maintenanceRepository'
import {fetchBillingPeriodSummary} from '~~/server/data/prismaRepository'
import {archiveBillingCsv} from '~~/server/utils/billingArchive'
import {emitBillingPeriodClosed} from '~~/server/utils/sender/events/monthly-billing'
import {useMaintenanceValidation} from '~/composables/useMaintenanceValidation'
import type {BillingGenerationResult, MonthlyBillingResponse} from '~/composables/useBillingValidation'
import type {NotificationConfig} from '~/composables/useNotificationValidation'

const LOG = '💰 > MONTHLY > [BILLING]'

/** The bindings and config the side effects need — from cloudflare.env and getNotificationConfig() at the call site */
export type MonthlyBillingSideEffects = {
    queue: Queue | undefined
    archive: R2Bucket | undefined
    notifications: NotificationConfig
}

const closePeriod = async (d1Client: D1Database, result: BillingGenerationResult, jobRunId: number, sideEffects: MonthlyBillingSideEffects): Promise<BillingGenerationResult> => {
    const summary = await fetchBillingPeriodSummary(d1Client, result.billingPeriodSummaryId)
    if (!summary) {
        console.error(`${LOG} period ${result.billingPeriodSummaryId} not found after generation — not archived, not sent`)
        return result
    }
    const archive = await archiveBillingCsv(sideEffects.archive, summary, jobRunId)
    const notification = await emitBillingPeriodClosed(sideEffects.queue, sideEffects.notifications, summary)
    return {...result, archive, notification}
}

export async function runMonthlyBilling(d1Client: D1Database, triggeredBy: string, sideEffects: MonthlyBillingSideEffects): Promise<MonthlyBillingResponse> {
    const {JobType, JobStatus} = useMaintenanceValidation()

    console.info(`${LOG} Starting monthly billing (triggeredBy=${triggeredBy})`)

    // Create job run record
    const jobRun = await createJobRun(d1Client, {
        jobType: JobType.MONTHLY_BILLING,
        triggeredBy
    })

    try {
        // Generate billing for ALL unbilled transactions, grouped by period
        const generated = await generateBilling(d1Client)

        if (generated.length === 0) {
            console.info(`${LOG} No transactions to bill`)
        } else {
            const totalInvoices = generated.reduce((sum, r) => sum + r.invoiceCount, 0)
            const totalTransactions = generated.reduce((sum, r) => sum + r.transactionCount, 0)
            const totalAmount = generated.reduce((sum, r) => sum + r.totalAmount, 0)
            console.info(`${LOG} Processed ${generated.length} period(s): ${totalInvoices} invoices, ${totalTransactions} transactions, ${totalAmount} øre`)
        }

        const results: BillingGenerationResult[] = []
        for (const result of generated) results.push(await closePeriod(d1Client, result, jobRun.id, sideEffects))

        // Complete job run with success - store results array
        await completeJobRun(d1Client, jobRun.id, JobStatus.SUCCESS, {results})

        console.info(`${LOG} Monthly billing complete (jobRunId=${jobRun.id})`)
        return {results, jobRunId: jobRun.id}
    } catch (error) {
        // Complete job run with failure
        await completeJobRun(
            d1Client,
            jobRun.id,
            JobStatus.FAILED,
            undefined,
            error instanceof Error ? error.message : 'Unknown error'
        )
        throw error
    }
}
