import {defineEventHandler, setResponseStatus, getQuery} from 'h3'
import {generateBilling} from '~~/server/utils/generateBilling'
import {createJobRun, completeJobRun} from '~~/server/data/maintenanceRepository'
import {useBillingValidation, type MonthlyBillingResponse} from '~/composables/useBillingValidation'
import {useMaintenanceValidation} from '~/composables/useMaintenanceValidation'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const {throwH3Error} = eventHandlerHelper
const LOG = '💰 > MONTHLY > [BILLING]'

/**
 * POST /api/admin/maintenance/monthly
 *
 * Runs monthly billing generation:
 * 1. Finds all unbilled transactions
 * 2. Groups transactions by household
 * 3. Creates BillingPeriodSummary
 * 4. Creates Invoices per household (with denormalized pbsId/address)
 * 5. Links transactions to invoices
 *
 * ADR-014 compliant: Uses createManyAndReturn for bulk inserts, batched updates
 * ADR-015 compliant: Idempotent - skips if billing period already exists
 *
 * Records job execution in JobRun table for observability.
 *
 * Query params:
 * - triggeredBy: "CRON" (default) or "ADMIN:<userId>" for manual triggers
 */
export default defineEventHandler(async (event): Promise<MonthlyBillingResponse> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    const {BillingGenerationResultSchema} = useBillingValidation()
    const {JobType, JobStatus} = useMaintenanceValidation()

    // Get triggeredBy from query params (CRON for scheduled, ADMIN:<userId> for manual)
    const query = getQuery(event)
    const triggeredBy = (query.triggeredBy as string) || 'CRON'

    console.info(`${LOG} Starting monthly billing (triggeredBy=${triggeredBy})`)

    // Create job run record
    const jobRun = await createJobRun(d1Client, {
        jobType: JobType.MONTHLY_BILLING,
        triggeredBy
    })

    try {
        // Generate billing (ADR-014 + ADR-015 compliant)
        const result = await generateBilling(d1Client)

        if (result) {
            console.info(`${LOG} Generated billing period ${result.billingPeriod}: ${result.invoiceCount} invoices, ${result.transactionCount} transactions, ${result.totalAmount} øre`)
        } else {
            console.info(`${LOG} Billing period already exists - idempotent skip`)
        }

        // Complete job run with success (convert null to undefined for repository)
        await completeJobRun(d1Client, jobRun.id, JobStatus.SUCCESS, result ?? undefined)

        console.info(`${LOG} Monthly billing complete (jobRunId=${jobRun.id})`)
        setResponseStatus(event, 200)
        // Wrap in object to ensure JSON response (null alone becomes 204 No Content)
        return {result: BillingGenerationResultSchema.parse(result), jobRunId: jobRun.id}
    } catch (error) {
        // Complete job run with failure
        await completeJobRun(
            d1Client,
            jobRun.id,
            JobStatus.FAILED,
            undefined,
            error instanceof Error ? error.message : 'Unknown error'
        )
        return throwH3Error(`${LOG} Error during monthly billing`, error)
    }
})
