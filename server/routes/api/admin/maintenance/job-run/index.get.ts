import {defineEventHandler, getValidatedQuery, setResponseStatus} from 'h3'
import {fetchJobRuns} from '~~/server/data/maintenanceRepository'
import {useMaintenanceValidation, type JobRunDisplay} from '~/composables/useMaintenanceValidation'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const {throwH3Error} = eventHandlerHelper
const LOG = '🔧 > JOB_RUN > [GET]'

/**
 * GET /api/admin/maintenance/job-run
 *
 * Fetch job run history with optional filtering.
 *
 * Query params:
 * - jobType: Optional filter by job type (e.g., "DAILY_MAINTENANCE")
 * - limit: Max results (default 10, max 100)
 */
export default defineEventHandler(async (event): Promise<JobRunDisplay[]> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    const {JobRunQuerySchema} = useMaintenanceValidation()

    // Validation - ADR-002
    let query
    try {
        query = await getValidatedQuery(event, JobRunQuerySchema.parse)
    } catch (e) {
        return throwH3Error(`${LOG} Invalid query parameters`, e, 400)
    }

    // Business logic - ADR-002
    try {
        console.info(`${LOG} Fetching job runs (jobType=${query.jobType ?? 'all'}, limit=${query.limit})`)

        const jobRuns = await fetchJobRuns(d1Client, query.jobType, query.limit)

        console.info(`${LOG} Found ${jobRuns.length} job runs`)
        setResponseStatus(event, 200)
        return jobRuns
    } catch (error) {
        return throwH3Error(`${LOG} Error fetching job runs`, error)
    }
})
