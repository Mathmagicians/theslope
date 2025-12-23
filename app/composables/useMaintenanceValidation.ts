import {z} from 'zod'
import {JobTypeSchema, JobStatusSchema} from '~~/prisma/generated/zod'
import {useBookingValidation, type DailyMaintenanceResult} from './useBookingValidation'
import {useHeynaboValidation, type HeynaboImportResponse} from './useHeynaboValidation'
import {useBillingValidation, type BillingGenerationResult} from './useBillingValidation'

/**
 * Validation schemas for maintenance/job entities
 * Following ADR-001: Zod schemas in composables for shared validation
 *
 * JobRun tracks execution history of automated jobs (ADR-015: Idempotent Automated Jobs)
 */
export const useMaintenanceValidation = () => {
    // Re-export enums for application code (ADR-001)
    const JobType = JobTypeSchema.enum
    const JobStatus = JobStatusSchema.enum

    // Import result schemas for deserialization
    const {DailyMaintenanceResultSchema} = useBookingValidation()
    const {HeynaboImportResponseSchema} = useHeynaboValidation()
    const {BillingGenerationResultSchema} = useBillingValidation()

    /**
     * JobRun Display - for index endpoint (GET /api/admin/job-run)
     * Single schema sufficient for this simple entity (ADR-009)
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

    /**
     * JobRun Create - for starting a new job run
     */
    const JobRunCreateSchema = z.object({
        jobType: JobTypeSchema,
        triggeredBy: z.string().default('CRON')
    })

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

    /**
     * Trigger job request (POST /api/admin/job-run/trigger)
     */
    const TriggerJobRequestSchema = z.object({
        jobType: JobTypeSchema
    })

    /**
     * Query params for listing job runs
     */
    const JobRunQuerySchema = z.object({
        jobType: JobTypeSchema.optional(),
        limit: z.coerce.number().int().min(1).max(100).default(10)
    })

    // ============================================================================
    // Serialization (ADR-010: Composable defines, repository uses)
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
     * Monthly billing stores {results: BillingGenerationResult[]}
     */
    const serializeResultSummary = (result: DailyMaintenanceResult | HeynaboImportResponse | {results: BillingGenerationResult[]} | _SeasonImportResponse): string =>
        JSON.stringify(result)

    /**
     * Deserialize and validate result summary from DB based on job type
     * Monthly billing returns array of results
     */
    const deserializeResultSummary = (
        jobType: z.infer<typeof JobTypeSchema>,
        resultSummary: string | null
    ): DailyMaintenanceResult | HeynaboImportResponse | BillingGenerationResult[] | _SeasonImportResponse | null => {
        if (!resultSummary) return null

        const parsed = JSON.parse(resultSummary)

        switch (jobType) {
            case JobType.DAILY_MAINTENANCE:
                return DailyMaintenanceResultSchema.parse(parsed)
            case JobType.HEYNABO_IMPORT:
                return HeynaboImportResponseSchema.parse(parsed)
            case JobType.MAINTENANCE_IMPORT:
                return SeasonImportResponseSchema.parse(parsed)
            case JobType.MONTHLY_BILLING:
                return parsed.results.map((r: unknown) => BillingGenerationResultSchema.parse(r))
            default:
                throw new Error(`Unknown job type: ${jobType}`)
        }
    }

    return {
        // Enum schemas (from generated layer)
        JobTypeSchema,
        JobStatusSchema,

        // Enum values for runtime checks
        JobType,
        JobStatus,

        // Entity schemas
        JobRunDisplaySchema,
        JobRunCreateSchema,
        JobRunUpdateSchema,
        TriggerJobRequestSchema,
        JobRunQuerySchema,

        // Result schemas
        SeasonImportResponseSchema,

        // Serialization (ADR-010)
        serializeResultSummary,
        deserializeResultSummary
    }
}

// Type exports (ADR-001)
export type JobRunDisplay = z.infer<ReturnType<typeof useMaintenanceValidation>['JobRunDisplaySchema']>
export type JobRunCreate = z.infer<ReturnType<typeof useMaintenanceValidation>['JobRunCreateSchema']>
export type JobRunUpdate = z.infer<ReturnType<typeof useMaintenanceValidation>['JobRunUpdateSchema']>
export type TriggerJobRequest = z.infer<ReturnType<typeof useMaintenanceValidation>['TriggerJobRequestSchema']>
export type JobType = z.infer<ReturnType<typeof useMaintenanceValidation>['JobTypeSchema']>
export type JobStatus = z.infer<ReturnType<typeof useMaintenanceValidation>['JobStatusSchema']>
export type SeasonImportResponse = z.infer<ReturnType<typeof useMaintenanceValidation>['SeasonImportResponseSchema']>
