import {defineEventHandler, getValidatedRouterParams, setResponseStatus} from 'h3'
import {z} from 'zod'
import {fetchJobRun} from '~~/server/data/maintenanceRepository'
import type {JobRunDisplay} from '~/composables/useMaintenanceValidation'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const {throwH3Error} = eventHandlerHelper
const LOG = '🔧 > JOB_RUN > [GET]'

const idSchema = z.object({
    id: z.coerce.number().int().positive()
})

/**
 * GET /api/admin/maintenance/job-run/[id]
 *
 * Fetch a single job run by ID.
 */
export default defineEventHandler(async (event): Promise<JobRunDisplay> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Validation - ADR-002
    let params
    try {
        params = await getValidatedRouterParams(event, idSchema.parse)
    } catch (e) {
        return throwH3Error(`${LOG} Invalid job run ID`, e, 400)
    }

    // Business logic - ADR-002
    try {
        console.info(`${LOG} Fetching job run ${params.id}`)

        const jobRun = await fetchJobRun(d1Client, params.id)

        if (!jobRun) {
            return throwH3Error(`${LOG} Job run ${params.id} not found`, new Error('Not found'), 404)
        }

        console.info(`${LOG} Found job run ${params.id}`)
        setResponseStatus(event, 200)
        return jobRun
    } catch (error) {
        return throwH3Error(`${LOG} Error fetching job run`, error)
    }
})
