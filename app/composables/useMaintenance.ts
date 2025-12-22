import {useMaintenanceValidation, type JobType, type JobStatus} from '~/composables/useMaintenanceValidation'
import {useBookingValidation, type DailyMaintenanceResult} from '~/composables/useBookingValidation'
import {useHeynaboValidation, type HeynaboImportResponse} from '~/composables/useHeynaboValidation'
import {useBillingValidation, type BillingGenerationResult} from '~/composables/useBillingValidation'

/**
 * Business logic for maintenance jobs
 * Following ADR-001: Business logic composable separate from validation
 * Following ADR-015: Idempotent Automated Jobs with Rolling Window
 */
export const useMaintenance = () => {
    const {JobType, JobStatus} = useMaintenanceValidation()
    const {DailyMaintenanceResultSchema} = useBookingValidation()
    const {HeynaboImportResponseSchema} = useHeynaboValidation()
    const {BillingGenerationResultSchema} = useBillingValidation()

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
            case JobStatus.RUNNING: return 'i-heroicons-arrow-path'
            case JobStatus.FAILED:
            default:
                return 'i-heroicons-x-circle'
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
        return triggeredBy
    }

    /**
     * Parse and validate resultSummary JSON based on job type
     * Monthly billing returns {results: BillingGenerationResult[]}
     */
    const parseResultSummary = (jobType: JobType, resultSummary: string | null): DailyMaintenanceResult | HeynaboImportResponse | BillingGenerationResult[] | Record<string, unknown> | null => {
        if (!resultSummary) return null

        try {
            const parsed = JSON.parse(resultSummary)

            switch (jobType) {
                case JobType.DAILY_MAINTENANCE:
                    return DailyMaintenanceResultSchema.parse(parsed)
                case JobType.HEYNABO_IMPORT:
                    return HeynaboImportResponseSchema.parse(parsed)
                case JobType.MONTHLY_BILLING:
                    return parsed.results.map((r: unknown) => BillingGenerationResultSchema.parse(r))
                default:
                    return parsed as Record<string, unknown>
            }
        } catch {
            return null
        }
    }

    /**
     * Format heynabo import result as stats array for action cards
     */
    const formatHeynaboStats = (result: HeynaboImportResponse): { label: string; value: string }[] => [
        { label: 'Husstande', value: `+${result.householdsCreated}, -${result.householdsDeleted}` },
        { label: 'Beboere', value: `+${result.inhabitantsCreated}, -${result.inhabitantsDeleted}` },
        { label: 'Brugere', value: `+${result.usersCreated}, -${result.usersDeleted}` }
    ]

    /**
     * Format daily maintenance result as stats array for action cards
     */
    const formatDailyMaintenanceStats = (result: DailyMaintenanceResult): { label: string; value: string }[] => {
        const stats = [
            { label: 'Middage afholdt', value: `${result.consume.consumed}` },
            { label: 'Ordrer lukket', value: `${result.close.closed}` },
            { label: 'Transaktioner', value: `${result.transact.created}` }
        ]
        if (result.scaffold) {
            stats.push({ label: 'Bookinger', value: `+${result.scaffold.created}, -${result.scaffold.deleted}` })
        }
        return stats
    }

    /**
     * Format monthly billing results as stats array for action cards
     * Aggregates totals across all billing periods
     */
    const {formatPrice} = useTicket()
    const formatMonthlyBillingStats = (results: BillingGenerationResult[]): { label: string; value: string }[] => {
        const totalInvoices = results.reduce((sum, r) => sum + r.invoiceCount, 0)
        const totalTransactions = results.reduce((sum, r) => sum + r.transactionCount, 0)
        const totalAmount = results.reduce((sum, r) => sum + r.totalAmount, 0)
        return [
            { label: 'Perioder', value: `${results.length}` },
            { label: 'PBS Fakturaer', value: `${totalInvoices}` },
            { label: 'Transaktioner', value: `${totalTransactions}` },
            { label: 'Total', value: `${formatPrice(totalAmount)} kr` }
        ]
    }

    /**
     * Format result summary for table display (uses stats functions for DRY)
     */
    const formatResultSummary = (jobType: JobType, resultSummary: string | null): string => {
        const parsed = parseResultSummary(jobType, resultSummary)
        if (!parsed) return '-'

        switch (jobType) {
            case JobType.DAILY_MAINTENANCE: {
                const result = parsed as DailyMaintenanceResult
                const stats = formatDailyMaintenanceStats(result)
                return stats.map(s => `${s.label}: ${s.value}`).join(', ')
            }
            case JobType.HEYNABO_IMPORT: {
                const result = parsed as HeynaboImportResponse
                const stats = formatHeynaboStats(result)
                return stats.map(s => `${s.label}: ${s.value}`).join(', ')
            }
            case JobType.MONTHLY_BILLING: {
                const results = parsed as BillingGenerationResult[]
                const stats = formatMonthlyBillingStats(results)
                return stats.map(s => `${s.label}: ${s.value}`).join(', ')
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
        formatResultSummary,
        formatHeynaboStats,
        formatDailyMaintenanceStats,
        formatMonthlyBillingStats
    }
}
