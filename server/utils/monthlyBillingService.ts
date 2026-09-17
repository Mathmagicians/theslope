/**
 * Monthly Billing Service
 *
 * Core logic for monthly billing generation, called by both:
 * - Nitro scheduled task (context.cloudflare.env)
 * - HTTP endpoint (event.context.cloudflare.env)
 *
 * ADR-014 compliant: Uses createManyAndReturn for bulk inserts
 * ADR-015 compliant: Idempotent - the end state of every closed period is the same after any number of runs:
 * all its transactions billed, its CSV in R2, the accountant mailed — each side effect recorded as a Delivery of
 * the period version it was done for, so a re-run redoes only what is missing (a failed put or send) or stale
 * (catch-up billing bumped the version). Every version is its own R2 object; a later version is mailed as an update.
 *
 * Multi-period support: Processes ALL unbilled transactions, grouping by
 * actual billing period (based on dinner date). Handles catch-up scenarios.
 */
import {generateBilling} from '~~/server/utils/generateBilling'
import {createJobRun, completeJobRun} from '~~/server/data/maintenanceRepository'
import {fetchBillingPeriodSummaries, fetchBillingPeriodSummary} from '~~/server/data/prismaRepository'
import {fetchDeliveries, recordDelivery} from '~~/server/data/deliveryRepository'
import {archiveBillingCsv} from '~~/server/utils/billingArchive'
import {decideBillingSideEffects} from '~~/server/utils/billingSideEffects'
import {emitBillingPeriodClosed} from '~~/server/utils/sender/events/monthly-billing'
import {useMaintenanceValidation} from '~/composables/useMaintenanceValidation'
import type {BillingPeriodSideEffects, BillingPeriodSummaryDetail, MonthlyBillingResponse} from '~/composables/useBillingValidation'
import type {NotificationConfig, SenderEmitResult} from '~/composables/useNotificationValidation'
import {deliveredVersions} from '~/composables/useDeliveryValidation'

const LOG = '💰 > MONTHLY > [BILLING]'

/** The bindings and config the side effects need — from cloudflare.env and getNotificationConfig() at the call site */
export type MonthlyBillingSideEffects = {
    queue: Queue | undefined
    archive: R2Bucket | undefined
    notifications: NotificationConfig
}

/** Queue the accountant mail for a period's current version and record the delivery — the monthly run and the re-send endpoint share this */
export const notifyBillingPeriod = async (d1Client: D1Database, queue: Queue | undefined, config: NotificationConfig, summary: BillingPeriodSummaryDetail, jobRunId?: number): Promise<SenderEmitResult> => {
    const notification = await emitBillingPeriodClosed(queue, config, summary)
    if (notification.queued) await recordDelivery(d1Client, {subjectType: 'BILLING_PERIOD', subjectId: summary.id, version: summary.version, kind: 'EMAIL', reference: notification.dedupeKey, jobRunId})
    return notification
}

/** Bring one closed period to its end state: CSV in R2 and accountant mail, at the period's current version */
const syncBillingPeriod = async (d1Client: D1Database, summary: BillingPeriodSummaryDetail, jobRunId: number, sideEffects: MonthlyBillingSideEffects): Promise<BillingPeriodSideEffects> => {
    const delivered = deliveredVersions(await fetchDeliveries(d1Client, 'BILLING_PERIOD', summary.id))
    const plan = decideBillingSideEffects({version: summary.version, archivedVersion: delivered.ARCHIVE, notifiedVersion: delivered.EMAIL})
    const state: BillingPeriodSideEffects = {billingPeriodSummaryId: summary.id, billingPeriod: summary.billingPeriod, version: summary.version, csvUploaded: !plan.archive, emailSent: !plan.notify}

    if (plan.archive) {
        state.archive = await archiveBillingCsv(sideEffects.archive, summary, jobRunId)
        if (state.archive.archived) {
            await recordDelivery(d1Client, {subjectType: 'BILLING_PERIOD', subjectId: summary.id, version: summary.version, kind: 'ARCHIVE', reference: state.archive.key, jobRunId})
            state.csvUploaded = true
        }
    }
    if (plan.notify) {
        state.notification = await notifyBillingPeriod(d1Client, sideEffects.queue, sideEffects.notifications, summary, jobRunId)
        state.emailSent = state.notification.queued
    }
    if (plan.archive || plan.notify) console.info(`${LOG} Period ${summary.billingPeriod} v${summary.version}: csvUploaded=${state.csvUploaded} emailSent=${state.emailSent}`)
    return state
}

const syncBillingPeriods = async (d1Client: D1Database, jobRunId: number, sideEffects: MonthlyBillingSideEffects): Promise<BillingPeriodSideEffects[]> => {
    const periods: BillingPeriodSideEffects[] = []
    for (const {id} of await fetchBillingPeriodSummaries(d1Client)) {
        const summary = await fetchBillingPeriodSummary(d1Client, id)
        if (summary) periods.push(await syncBillingPeriod(d1Client, summary, jobRunId, sideEffects))
    }
    return periods
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
        const results = await generateBilling(d1Client)

        if (results.length === 0) {
            console.info(`${LOG} No transactions to bill`)
        } else {
            const totalInvoices = results.reduce((sum, r) => sum + r.invoiceCount, 0)
            const totalTransactions = results.reduce((sum, r) => sum + r.transactionCount, 0)
            const totalAmount = results.reduce((sum, r) => sum + r.totalAmount, 0)
            console.info(`${LOG} Processed ${results.length} period(s): ${totalInvoices} invoices, ${totalTransactions} transactions, ${totalAmount} øre`)
        }

        // Converge every closed period: CSV in R2 + accountant mail, done or redone as its content requires
        const periods = await syncBillingPeriods(d1Client, jobRun.id, sideEffects)
        const pending = periods.filter(p => !p.csvUploaded || !p.emailSent)
        if (pending.length > 0) console.warn(`${LOG} ${pending.length} period(s) still pending a side effect: ${pending.map(p => p.billingPeriod).join(', ')}`)

        // Complete job run with success - store results and period states
        await completeJobRun(d1Client, jobRun.id, JobStatus.SUCCESS, {results, periods})

        console.info(`${LOG} Monthly billing complete (jobRunId=${jobRun.id})`)
        return {results, periods, jobRunId: jobRun.id}
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
