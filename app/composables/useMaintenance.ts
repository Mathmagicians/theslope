import {useMaintenanceValidation, type JobType, type JobStatus} from './useMaintenanceValidation'
import {useBookingValidation, type DailyMaintenanceResult} from './useBookingValidation'
import {useHeynaboValidation, type HeynaboImportResponse} from './useHeynaboValidation'

/**
 * Business logic for maintenance jobs
 * Following ADR-001: Business logic composable separate from validation
 * Following ADR-015: Idempotent Automated Jobs with Rolling Window
 */
export const useMaintenance = () => {
    const {JobType, JobStatus} = useMaintenanceValidation()
    const {DailyMaintenanceResultSchema} = useBookingValidation()
    const {HeynaboImportResponseSchema} = useHeynaboValidation()

    /**
     * Human-readable labels for job types (Danish)
     */
    const jobTypeLabels: Record<JobType, string> = {
        [JobType.DAILY_MAINTENANCE]: 'Daglig vedligeholdelse',
        [JobType.MONTHLY_BILLING]: 'Månedlig fakturering',
        [JobType.HEYNABO_IMPORT]: 'Heynabo import',
        [JobType.MAINTENANCE_IMPORT]: 'Data import',
        [JobType.MAINTENANCE_EXPORT]: 'Data eksport'
    }

    /**
     * Human-readable labels for job statuses (Danish)
     */
    const jobStatusLabels: Record<JobStatus, string> = {
        [JobStatus.RUNNING]: 'Kører',
        [JobStatus.SUCCESS]: 'Gennemført',
        [JobStatus.PARTIAL]: 'Delvis gennemført',
        [JobStatus.FAILED]: 'Fejlet'
    }

    /**
     * Job schedule descriptions (Danish)
     */
    const jobScheduleLabels: Record<JobType, string> = {
        [JobType.DAILY_MAINTENANCE]: 'Kl. 02:00',
        [JobType.MONTHLY_BILLING]: '1. hver måned',
        [JobType.HEYNABO_IMPORT]: 'Manuel',
        [JobType.MAINTENANCE_IMPORT]: 'Manuel',
        [JobType.MAINTENANCE_EXPORT]: 'Manuel'
    }

    /**
     * Get UI color for job status
     */
    const getJobStatusColor = (status: JobStatus): 'success' | 'warning' | 'error' | 'info' => {
        switch (status) {
            case JobStatus.SUCCESS: return 'success'
            case JobStatus.PARTIAL: return 'warning'
            case JobStatus.FAILED: return 'error'
            case JobStatus.RUNNING: return 'info'
        }
    }

    /**
     * Get UI icon for job status
     */
    const getJobStatusIcon = (status: JobStatus): string => {
        switch (status) {
            case JobStatus.SUCCESS: return 'i-heroicons-check-circle'
            case JobStatus.PARTIAL: return 'i-heroicons-exclamation-triangle'
            case JobStatus.FAILED: return 'i-heroicons-x-circle'
            case JobStatus.RUNNING: return 'i-heroicons-arrow-path'
        }
    }

    /**
     * Format duration in human-readable format
     */
    const formatDuration = (durationMs: number | null): string => {
        if (durationMs === null) return '-'
        if (durationMs < 1000) return `${durationMs}ms`
        return `${(durationMs / 1000).toFixed(1)}s`
    }

    /**
     * Format triggeredBy field for display
     */
    const formatTriggeredBy = (triggeredBy: string): string => {
        if (triggeredBy === 'CRON') return 'Automatisk'
        if (triggeredBy.startsWith('ADMIN:')) return 'Manuel'
        return triggeredBy
    }

    /**
     * Parse and validate resultSummary JSON based on job type
     */
    const parseResultSummary = (jobType: JobType, resultSummary: string | null): DailyMaintenanceResult | HeynaboImportResponse | Record<string, unknown> | null => {
        if (!resultSummary) return null

        try {
            const parsed = JSON.parse(resultSummary)

            switch (jobType) {
                case JobType.DAILY_MAINTENANCE:
                    return DailyMaintenanceResultSchema.parse(parsed)
                case JobType.HEYNABO_IMPORT:
                    return HeynaboImportResponseSchema.parse(parsed)
                default:
                    return parsed as Record<string, unknown>
            }
        } catch {
            return null
        }
    }

    /**
     * Format result summary for display based on job type
     */
    const formatResultSummary = (jobType: JobType, resultSummary: string | null): string => {
        const parsed = parseResultSummary(jobType, resultSummary)
        if (!parsed) return '-'

        switch (jobType) {
            case JobType.DAILY_MAINTENANCE: {
                const result = parsed as DailyMaintenanceResult
                const parts: string[] = []

                if (result.consume.consumed) parts.push(`${result.consume.consumed} middage`)
                if (result.close.closed) parts.push(`${result.close.closed} ordrer`)
                if (result.transact.created) parts.push(`${result.transact.created} trans.`)
                if (result.scaffold?.created) parts.push(`${result.scaffold.created} bookinger`)

                return parts.length > 0 ? parts.join(', ') : 'Ingen ændringer'
            }
            case JobType.HEYNABO_IMPORT: {
                const result = parsed as HeynaboImportResponse
                const parts: string[] = []

                if (result.householdsCreated) parts.push(`+${result.householdsCreated} husstande`)
                if (result.inhabitantsCreated) parts.push(`+${result.inhabitantsCreated} beboere`)
                if (result.usersCreated) parts.push(`+${result.usersCreated} brugere`)

                return parts.length > 0 ? parts.join(', ') : 'Ingen ændringer'
            }
            case JobType.MONTHLY_BILLING: {
                const result = parsed as Record<string, unknown>
                if (typeof result.invoicesGenerated === 'number') {
                    return `${result.invoicesGenerated} fakturaer`
                }
                return '-'
            }
            case JobType.MAINTENANCE_IMPORT:
            case JobType.MAINTENANCE_EXPORT:
                return JSON.stringify(parsed)
        }
    }

    return {
        // Labels
        jobTypeLabels,
        jobStatusLabels,
        jobScheduleLabels,

        // UI helpers
        getJobStatusColor,
        getJobStatusIcon,
        formatDuration,
        formatTriggeredBy,
        parseResultSummary,
        formatResultSummary
    }
}
