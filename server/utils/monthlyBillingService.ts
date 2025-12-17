/**
 * Monthly Billing Service
 *
 * Core logic for monthly billing generation, called by both:
 * - Nitro scheduled task (context.cloudflare.env.DB)
 * - HTTP endpoint (event.context.cloudflare.env.DB)
 *
 * ADR-014 compliant: Uses createManyAndReturn for bulk inserts
 * ADR-015 compliant: Idempotent - skips if billing period already exists
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
        // Generate billing (ADR-014 + ADR-015 compliant)
        const result = await generateBilling(d1Client)

        console.info(`${LOG} Billing period ${result.billingPeriod}: ${result.invoiceCount} invoices, ${result.transactionCount} transactions, ${result.totalAmount} øre`)

        // Complete job run with success
        await completeJobRun(d1Client, jobRun.id, JobStatus.SUCCESS, result)

        console.info(`${LOG} Monthly billing complete (jobRunId=${jobRun.id})`)
        return {result, jobRunId: jobRun.id}
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
