import type {D1Database} from '@cloudflare/workers-types'
import {Prisma as _PrismaSkip, Prisma} from '@prisma/client'
import {getPrismaClientConnection} from './allergyRepository'
import type {
    JobRunDisplay,
    JobRunCreate,
    JobRunUpdate,
    JobType,
    SeasonImportResponse
} from '~/composables/useMaintenanceValidation'
import {useMaintenanceValidation} from '~/composables/useMaintenanceValidation'
import type {DailyMaintenanceResult} from '~/composables/useBookingValidation'
import type {HeynaboImportResponse} from '~/composables/useHeynaboValidation'
import type {BillingGenerationResult} from '~~/server/utils/generateBilling'

const LOG = '🔧 > JOB_RUN'

/**
 * Result types that can be stored in JobRun.resultSummary
 */
export type JobResultSummary = DailyMaintenanceResult | HeynaboImportResponse | BillingGenerationResult | SeasonImportResponse

/**
 * Fetch recent job runs with optional filtering by job type
 * Returns JobRunDisplay[] ordered by startedAt descending
 */
export async function fetchJobRuns(
    d1Client: D1Database,
    jobType?: JobType,
    limit: number = 10
): Promise<JobRunDisplay[]> {
    console.info(`${LOG} > [GET] Fetching job runs (jobType=${jobType ?? 'all'}, limit=${limit})`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {JobRunDisplaySchema} = useMaintenanceValidation()

    const jobRuns = await prisma.jobRun.findMany({
        where: jobType ? {jobType} : Prisma.skip,
        orderBy: {startedAt: 'desc'},
        take: limit
    })

    console.info(`${LOG} > [GET] Found ${jobRuns.length} job runs`)

    return jobRuns.map(jr => JobRunDisplaySchema.parse(jr))
}

/**
 * Fetch single job run by ID
 * Returns JobRunDisplay or null if not found
 */
export async function fetchJobRun(
    d1Client: D1Database,
    id: number
): Promise<JobRunDisplay | null> {
    console.info(`${LOG} > [GET] Fetching job run with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {JobRunDisplaySchema} = useMaintenanceValidation()

    const jobRun = await prisma.jobRun.findUnique({
        where: {id}
    })

    if (!jobRun) {
        console.info(`${LOG} > [GET] Job run ${id} not found`)
        return null
    }

    return JobRunDisplaySchema.parse(jobRun)
}

/**
 * Fetch the most recent job run for a specific job type
 * Returns JobRunDisplay or null if no runs exist
 */
export async function fetchLatestJobRun(
    d1Client: D1Database,
    jobType: JobType
): Promise<JobRunDisplay | null> {
    console.info(`${LOG} > [GET] Fetching latest job run for ${jobType}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {JobRunDisplaySchema} = useMaintenanceValidation()

    const jobRun = await prisma.jobRun.findFirst({
        where: {jobType},
        orderBy: {startedAt: 'desc'}
    })

    if (!jobRun) {
        console.info(`${LOG} > [GET] No job runs found for ${jobType}`)
        return null
    }

    return JobRunDisplaySchema.parse(jobRun)
}

/**
 * Create a new job run with RUNNING status
 * Used at the start of job execution
 */
export async function createJobRun(
    d1Client: D1Database,
    data: JobRunCreate
): Promise<JobRunDisplay> {
    console.info(`${LOG} > [CREATE] Starting job run for ${data.jobType} (triggeredBy=${data.triggeredBy})`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {JobRunDisplaySchema, JobStatus} = useMaintenanceValidation()

    const jobRun = await prisma.jobRun.create({
        data: {
            jobType: data.jobType,
            status: JobStatus.RUNNING,
            triggeredBy: data.triggeredBy
        }
    })

    console.info(`${LOG} > [CREATE] Created job run ${jobRun.id}`)

    return JobRunDisplaySchema.parse(jobRun)
}

/**
 * Update a job run with completion status
 * Used when job completes (success, partial, or failed)
 */
export async function updateJobRun(
    d1Client: D1Database,
    id: number,
    data: JobRunUpdate
): Promise<JobRunDisplay> {
    console.info(`${LOG} > [UPDATE] Updating job run ${id} with status=${data.status}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {JobRunDisplaySchema} = useMaintenanceValidation()

    const jobRun = await prisma.jobRun.update({
        where: {id},
        data: {
            status: data.status,
            completedAt: data.completedAt ?? Prisma.skip,
            durationMs: data.durationMs ?? Prisma.skip,
            resultSummary: data.resultSummary ?? Prisma.skip,
            errorMessage: data.errorMessage ?? Prisma.skip
        }
    })

    console.info(`${LOG} > [UPDATE] Updated job run ${id}`)

    return JobRunDisplaySchema.parse(jobRun)
}

/**
 * Complete a job run with calculated duration
 * Convenience function that calculates durationMs from startedAt
 * Uses serializeResultSummary from validation composable (ADR-010)
 */
export async function completeJobRun(
    d1Client: D1Database,
    id: number,
    status: JobRunUpdate['status'],
    result?: JobResultSummary,
    errorMessage?: string
): Promise<JobRunDisplay> {
    const prisma = await getPrismaClientConnection(d1Client)
    const {JobRunDisplaySchema, serializeResultSummary} = useMaintenanceValidation()

    // Fetch current job run to calculate duration
    const existing = await prisma.jobRun.findUnique({
        where: {id},
        select: {startedAt: true}
    })

    const completedAt = new Date()
    const durationMs = existing ? completedAt.getTime() - existing.startedAt.getTime() : null
    const resultSummary = result ? serializeResultSummary(result) : Prisma.skip

    console.info(`${LOG} > [COMPLETE] Completing job run ${id} with status=${status}, duration=${durationMs}ms`)

    const jobRun = await prisma.jobRun.update({
        where: {id},
        data: {
            status,
            completedAt,
            durationMs,
            resultSummary,
            errorMessage: errorMessage ?? Prisma.skip
        }
    })

    return JobRunDisplaySchema.parse(jobRun)
}
