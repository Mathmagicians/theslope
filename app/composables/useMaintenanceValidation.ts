import {z} from 'zod'
import {JobTypeSchema, JobStatusSchema} from '~~/prisma/generated/zod'
import type {DailyMaintenanceResult} from './useBookingValidation'
import type {HeynaboImportResponse} from './useHeynaboValidation'
import type {MonthlyBillingJobResult} from './useBillingValidation'

/**
 * Validation schemas for maintenance/job entities
 *
 * JobRun tracks execution history of automated jobs
 */
export const useMaintenanceValidation = () => {
    // Re-export enums for application code
    const JobType = JobTypeSchema.enum
    const JobStatus = JobStatusSchema.enum

    /**
     * JobRun Display - for index endpoint (GET /api/admin/job-run)
     * Single schema sufficient for this simple entity
     */
    const JobRunDisplaySchema = z.object({
        id: z.number().int().positive(),
        jobType: JobTypeSchema,
        status: JobStatusSchema,
        startedAt: z.coerce.date(),
        completedAt: z.coerce.date().nullable(),
        durationMs: z.number().int().nullable(),
        resultSummary: z.string().nullable(),
        errorMessage: z.string().nullable(),
        triggeredBy: z.string()
    })

    /** Who starts a job: the cron or an admin */
    const JobTriggerSchema = z.enum(['CRON', 'ADMIN'])
    const JobTrigger = JobTriggerSchema.enum

    /**
     * JobRun Create - for starting a new job run
     */
    const JobRunCreateSchema = z.object({
        jobType: JobTypeSchema,
        triggeredBy: z.string().default(JobTrigger.CRON)
    })

    /** The trigger of a job an admin starts: by the admin's mail from the app, by its name from an import */
    const adminTrigger = (who: string | undefined): string => `${JobTrigger.ADMIN}:${who}`

    /**
     * JobRun Update - for completing a job run
     */
    const JobRunUpdateSchema = z.object({
        status: JobStatusSchema,
        completedAt: z.coerce.date().optional(),
        durationMs: z.number().int().optional(),
        resultSummary: z.string().optional(),
        errorMessage: z.string().optional()
    })

    /** The query of a job an admin starts over HTTP: the trigger the app names, else the admin */
    const JobTriggerQuerySchema = z.object({
        triggeredBy: z.string().optional().transform(triggeredBy => triggeredBy || JobTrigger.ADMIN)
    })

    /**
     * Query params for listing job runs
     */
    const JobRunQuerySchema = z.object({
        jobType: JobTypeSchema.optional(),
        limit: z.coerce.number().int().min(1).max(100).default(10)
    })

    // ============================================================================
    // Serialization: the composable defines it, the repository uses it
    // ============================================================================

    /**
     * Season Import Response - result for MAINTENANCE_IMPORT job type
     */
    const SeasonImportResponseSchema = z.object({
        seasonId: z.number().int().positive(),
        seasonShortName: z.string(),
        isNew: z.boolean(),
        teamsCreated: z.number().int().min(0),
        dinnerEventsCreated: z.number().int().min(0),
        teamAssignmentsCreated: z.number().int().min(0),
        unmatchedNames: z.array(z.string())
    })

    // Internal type alias for use within this composable
    type _SeasonImportResponse = z.infer<typeof SeasonImportResponseSchema>

    /**
     * Serialize result summary for storage in DB
     * Monthly billing stores {results, periods} (MonthlyBillingJobResult)
     */
    const serializeResultSummary = (result: DailyMaintenanceResult | HeynaboImportResponse | MonthlyBillingJobResult | _SeasonImportResponse): string =>
        JSON.stringify(result)

    return {
        // Enum schemas (from generated layer)
        JobTypeSchema,
        JobStatusSchema,

        // Enum values for runtime checks
        JobType,
        JobStatus,
        JobTrigger,

        // Entity schemas
        JobRunDisplaySchema,
        JobRunCreateSchema,
        JobRunUpdateSchema,
        JobTriggerQuerySchema,
        JobRunQuerySchema,
        adminTrigger,

        // Result schemas
        SeasonImportResponseSchema,

        // Serialization
        serializeResultSummary
    }
}

// Type exports
export type JobRunDisplay = z.infer<ReturnType<typeof useMaintenanceValidation>['JobRunDisplaySchema']>
export type JobRunCreate = z.infer<ReturnType<typeof useMaintenanceValidation>['JobRunCreateSchema']>
export type JobRunUpdate = z.infer<ReturnType<typeof useMaintenanceValidation>['JobRunUpdateSchema']>
export type JobType = z.infer<ReturnType<typeof useMaintenanceValidation>['JobTypeSchema']>
export type JobStatus = z.infer<ReturnType<typeof useMaintenanceValidation>['JobStatusSchema']>
export type SeasonImportResponse = z.infer<ReturnType<typeof useMaintenanceValidation>['SeasonImportResponseSchema']>
