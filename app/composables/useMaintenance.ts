import {useMaintenanceValidation, type JobType, type JobStatus} from '~/composables/useMaintenanceValidation'
import {useBookingValidation, type DailyMaintenanceResult} from '~/composables/useBookingValidation'
import {useHeynaboValidation, type HeynaboImportResponse} from '~/composables/useHeynaboValidation'
import {useBillingValidation, type MonthlyBillingJobResult} from '~/composables/useBillingValidation'
import {useDeliveryValidation} from '~/composables/useDeliveryValidation'
import {useBooking} from '~/composables/useBooking'
import {NOTIFICATION_COUNT_WORDS} from '~/config/notificationTemplates'
import {MAINTENANCE_WORDS} from '~/config/maintenanceWords'
import {formatDate, DATE_SETTINGS} from '~/utils/date'
import {COLOR, ICONS} from '~/composables/useTheSlopeDesignSystem'
import type {ZodType} from 'zod'

/** A line of a job run's result: the icon of its kind, its label and its value */
export type JobStat = {icon: string; label: string; value: string}

/** A stat as its line of text */
export const formatJobStat = ({label, value}: JobStat): string => `${label}: ${value}`

/** A run's stats as one line: the job history's result and the job's toast */
export const formatJobStats = (stats: JobStat[]): string => stats.map(formatJobStat).join(', ')

/**
 * Business logic for maintenance jobs
 * Following ADR-001: Business logic composable separate from validation
 * Following ADR-015: Idempotent Automated Jobs with Rolling Window
 */
export const useMaintenance = () => {
    const {JobType, JobStatus} = useMaintenanceValidation()
    const {DailyMaintenanceResultSchema} = useBookingValidation()
    const {formatScaffoldResult} = useBooking()
    const {HeynaboImportResponseSchema} = useHeynaboValidation()
    const {MonthlyBillingJobResultSchema} = useBillingValidation()
    const {SenderEventSchema} = useDeliveryValidation()

    /**
     * Get UI color for job status
     */
    const getJobStatusColor = (status: JobStatus) => {
        switch (status) {
            case JobStatus.SUCCESS: return COLOR.success
            case JobStatus.PARTIAL: return COLOR.warning
            case JobStatus.FAILED: return COLOR.error
            case JobStatus.RUNNING: return COLOR.info
        }
    }

    /**
     * Get UI icon for job status
     */
    const getJobStatusIcon = (status: JobStatus): string => {
        switch (status) {
            case JobStatus.SUCCESS: return ICONS.checkCircle
            case JobStatus.PARTIAL: return ICONS.warning
            case JobStatus.RUNNING: return ICONS.sync
            case JobStatus.FAILED: return ICONS.jobFailed
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

    /** A stored result as JSON; null for none and for text that is not JSON */
    const readStoredResult = (resultSummary: string | null): unknown => {
        if (!resultSummary) return null
        try {
            return JSON.parse(resultSummary)
        } catch {
            return null
        }
    }

    /** The stats of a stored result its job's schema reads; null for one it does not */
    const statsOf = <T>(schema: ZodType<T>, formatStats: (result: T) => JobStat[], stored: unknown): JobStat[] | null => {
        const read = schema.safeParse(stored)
        return read.success ? formatStats(read.data) : null
    }

    /**
     * Format heynabo import result as stats array for action cards
     * Shows all 4 reconciliation outcomes: created, updated, idempotent, deleted
     */
    const formatHeynaboStats = (result: HeynaboImportResponse): JobStat[] => {
        const label = MAINTENANCE_WORDS.stats[JobType.HEYNABO_IMPORT]
        return [
            {
                icon: ICONS.household,
                label: label.households,
                value: `+${result.householdsCreated} ~${result.householdsUpdated ?? 0} =${result.householdsIdempotent ?? 0} -${result.householdsDeleted}`
            },
            {
                icon: ICONS.users,
                label: label.inhabitants,
                value: `+${result.inhabitantsCreated} ~${result.inhabitantsUpdated ?? 0} =${result.inhabitantsIdempotent ?? 0} -${result.inhabitantsDeleted}`
            },
            {
                icon: ICONS.user,
                label: label.users,
                value: `+${result.usersCreated} ~${result.usersUpdated ?? 0} =${result.usersIdempotent ?? 0} -${result.usersDeleted}`
            },
            {
                icon: ICONS.info,
                label: label.linked,
                value: `${result.usersLinked}`
            },
            {
                icon: ICONS.info,
                label: label.admins,
                value: `+${result.adminsAdded ?? 0} -${result.adminsRemoved ?? 0}`
            }
        ]
    }

    /** The scaffold's compact symbols per dinner: the date and `-n` entries removed */
    const formatClearedWaitlists = ({dinners}: DailyMaintenanceResult['clearWaitlist']): string =>
        dinners.length > 0 ? dinners.map(d => `${formatDate(d.date, DATE_SETTINGS.DAY_MONTH_MASK)} -${d.cleared}`).join(', ') : '0'

    /** Per sender event its symbol and the notifications sent; an event that sent none is left out */
    const formatNotificationCounts = (notifications: DailyMaintenanceResult['notifications']): string => {
        const {symbols, none} = NOTIFICATION_COUNT_WORDS
        const parts = SenderEventSchema.options.flatMap(senderEvent => {
            const sent = notifications[senderEvent]?.sent ?? 0
            return sent > 0 ? [`${symbols[senderEvent]} ${sent}`] : []
        })
        return parts.length > 0 ? parts.join(', ') : none
    }

    /** Format daily maintenance result as stats array for action cards; the bookings line only for a run that scaffolded */
    const formatDailyMaintenanceStats = (result: DailyMaintenanceResult): JobStat[] => {
        const label = MAINTENANCE_WORDS.stats[JobType.DAILY_MAINTENANCE]
        return [
            { icon: ICONS.checkCircle, label: label.consumed, value: `${result.consume.consumed}` },
            { icon: ICONS.ticket, label: label.closed, value: `${result.close.closed}` },
            { icon: ICONS.shoppingCart, label: label.transactions, value: `${result.transact.created}` },
            { icon: ICONS.waitlist, label: label.waitlists, value: formatClearedWaitlists(result.clearWaitlist) },
            { icon: ICONS.edit, label: label.preferences, value: `${result.initPrefs.initialized}` },
            ...(result.scaffold ? [{ icon: ICONS.ticket, label: label.bookings, value: formatScaffoldResult(result.scaffold) }] : []),
            { icon: ICONS.notification, label: NOTIFICATION_COUNT_WORDS.label, value: formatNotificationCounts(result.notifications) }
        ]
    }

    /**
     * Format monthly billing results as stats array for action cards
     * Aggregates totals across all billing periods
     */
    const {formatPrice} = useTicket()
    const formatMonthlyBillingStats = ({results, periods}: MonthlyBillingJobResult): JobStat[] => {
        const totalInvoices = results.reduce((sum, r) => sum + r.invoiceCount, 0)
        const totalTransactions = results.reduce((sum, r) => sum + r.transactionCount, 0)
        const totalAmount = results.reduce((sum, r) => sum + r.totalAmount, 0)
        // Side effects of this run (ADR-015): CSVs put in R2, accountant mails queued, periods still behind
        const csvUploaded = periods.filter(p => p.archive?.archived).length
        const mailsSent = periods.filter(p => p.notification?.queued).length
        const pending = periods.filter(p => !p.csvUploaded || !p.emailSent).length
        const label = MAINTENANCE_WORDS.stats[JobType.MONTHLY_BILLING]
        return [
            { icon: ICONS.calendar, label: label.periods, value: `${results.length}` },
            { icon: ICONS.ticket, label: label.invoices, value: `${totalInvoices}` },
            { icon: ICONS.shoppingCart, label: label.transactions, value: `${totalTransactions}` },
            { icon: ICONS.economy, label: label.total, value: `${formatPrice(totalAmount)} kr` },
            { icon: ICONS.info, label: label.csvUploaded, value: `${csvUploaded}` },
            { icon: ICONS.info, label: label.mailsSent, value: `${mailsSent}` },
            { icon: ICONS.info, label: label.pending, value: `${pending}` }
        ]
    }

    /**
     * A run's stats from its stored result, read with its job's schema (monthly billing: {results, periods});
     * null for a run whose result its schema does not read, and for the jobs that report no stats
     */
    const jobRunStats = (jobType: JobType, resultSummary: string | null): JobStat[] | null => {
        const stored = readStoredResult(resultSummary)
        switch (jobType) {
            case JobType.DAILY_MAINTENANCE: return statsOf(DailyMaintenanceResultSchema, formatDailyMaintenanceStats, stored)
            case JobType.HEYNABO_IMPORT: return statsOf(HeynaboImportResponseSchema, formatHeynaboStats, stored)
            case JobType.MONTHLY_BILLING: return statsOf(MonthlyBillingJobResultSchema, formatMonthlyBillingStats, stored)
            case JobType.MAINTENANCE_IMPORT:
            case JobType.MAINTENANCE_EXPORT:
                return null
        }
    }

    /** A run's result as the job history's line: its stats, or the stored JSON of a job without stats */
    const formatResultSummary = (jobType: JobType, resultSummary: string | null): string => {
        switch (jobType) {
            case JobType.DAILY_MAINTENANCE:
            case JobType.HEYNABO_IMPORT:
            case JobType.MONTHLY_BILLING: {
                const stats = jobRunStats(jobType, resultSummary)
                return stats ? formatJobStats(stats) : '-'
            }
            case JobType.MAINTENANCE_IMPORT:
            case JobType.MAINTENANCE_EXPORT: {
                const stored = readStoredResult(resultSummary)
                return stored ? JSON.stringify(stored) : '-'
            }
        }
    }

    return {
        // Labels
        jobTypeLabels: MAINTENANCE_WORDS.jobTypes,
        jobStatusLabels: MAINTENANCE_WORDS.jobStatuses,

        // UI helpers
        getJobStatusColor,
        getJobStatusIcon,
        formatDuration,
        jobRunStats,
        formatResultSummary,
        formatHeynaboStats,
        formatDailyMaintenanceStats,
        formatMonthlyBillingStats
    }
}
