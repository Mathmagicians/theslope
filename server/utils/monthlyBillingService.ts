/**
 * Monthly Billing Service
 *
 * Core logic for monthly billing generation, called by both:
 * - Nitro scheduled task (context.cloudflare.env.DB)
 * - HTTP endpoint (event.context.cloudflare.env.DB)
 *
 * ADR-014 compliant: Uses createManyAndReturn for bulk inserts
 * ADR-015 compliant: Idempotent - skips if billing period already exists
 *
 * Multi-period support: Processes ALL unbilled transactions, grouping by
 * actual billing period (based on dinner date). Handles catch-up scenarios.
 */
import type {D1Database} from '@cloudflare/workers-types'
import {generateBilling} from '~~/server/utils/generateBilling'
import {createJobRun, completeJobRun} from '~~/server/data/maintenanceRepository'
import {useMaintenanceValidation} from '~/composables/useMaintenanceValidation'
import type {MonthlyBillingResponse} from '~/composables/useBillingValidation'

const LOG = '💰 > MONTHLY > [BILLING]'

export async function runMonthlyBilling(d1Client: D1Database, triggeredBy: string): Promise<MonthlyBillingResponse> {
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
