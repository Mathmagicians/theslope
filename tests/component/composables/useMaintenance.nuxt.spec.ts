import {beforeAll, describe, expect, it} from 'vitest'
import {useMaintenance, type JobStat} from '~/composables/useMaintenance'
import {useMaintenanceValidation} from '~/composables/useMaintenanceValidation'
import {useDeliveryValidation} from '~/composables/useDeliveryValidation'
import {NOTIFICATION_COUNT_WORDS} from '~/config/notificationTemplates'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'

// @nuxt/test-utils 4 starts Nuxt in beforeAll: composables run there, not at module level
type Maintenance = ReturnType<typeof useMaintenance>
let formatMonthlyBillingStats: Maintenance['formatMonthlyBillingStats']
let formatDailyMaintenanceStats: Maintenance['formatDailyMaintenanceStats']
let jobRunStats: Maintenance['jobRunStats']
let formatResultSummary: Maintenance['formatResultSummary']
beforeAll(() => {
    ({formatMonthlyBillingStats, formatDailyMaintenanceStats, jobRunStats, formatResultSummary} = useMaintenance())
})
const {JobType} = useMaintenanceValidation()

const billed = {billingPeriodSummaryId: 8, billingPeriod: '18/08/2026-17/09/2026', invoiceCount: 3, transactionCount: 12, totalAmount: 41230}
const stat = (stats: JobStat[] | null, label: string) => stats?.find(s => s.label === label)?.value

describe('formatMonthlyBillingStats', () => {
    it('reports what the run billed and what it did to R2 and the mailbox', () => {
        const stats = formatMonthlyBillingStats({
            results: [billed],
            periods: [
                BillingFactory.defaultPeriodSideEffects({billingPeriodSummaryId: 8, archive: {key: 'billing/2026-09/pbs-opgoerelse-2026-09-v1.csv', filename: 'x.csv', sizeBytes: 10, version: 1, archived: true, degraded: false}, notification: {queued: true, dedupeKey: 'BILLING_PERIOD_CLOSED:EMAIL:r***@e***.com:id', degraded: false}}),
                BillingFactory.defaultPeriodSideEffects({billingPeriodSummaryId: 7, archive: {key: 'billing/2026-08/pbs-opgoerelse-2026-08-v1.csv', filename: 'y.csv', sizeBytes: 10, version: 1, archived: true, degraded: false}}),
                BillingFactory.defaultPeriodSideEffects({billingPeriodSummaryId: 6})
            ]
        })

        expect(stat(stats, 'Perioder')).toBe('1')
        expect(stat(stats, 'CSV uploadet')).toBe('2')
        expect(stat(stats, 'Mails sendt')).toBe('1')
        expect(stat(stats, 'Afventer')).toBe('0')
    })

    it('counts a period whose CSV or mail is still behind as pending', () => {
        const stats = formatMonthlyBillingStats({results: [], periods: [
            BillingFactory.defaultPeriodSideEffects({billingPeriodSummaryId: 1, csvUploaded: false}),
            BillingFactory.defaultPeriodSideEffects({billingPeriodSummaryId: 2, emailSent: false}),
            BillingFactory.defaultPeriodSideEffects({billingPeriodSummaryId: 3})
        ]})

        expect(stat(stats, 'Afventer')).toBe('2')
    })
})

// The job runs page's notifications line is compact like the bookings line and always shows: per sender event its
// symbol and the notifications sent; an event that sent none is left out, and a line with no event left reads none
describe('formatDailyMaintenanceStats', () => {
    const {BOOKING_STATUS, MONTHLY_BILLING, CHEF_DEADLINES} = useDeliveryValidation().SenderEventSchema.enum
    const {symbols: symbol, none} = NOTIFICATION_COUNT_WORDS

    it.each([
        {run: 'sent booking status notifications', notifications: {[BOOKING_STATUS]: {sent: 8}}, line: `${symbol[BOOKING_STATUS]} 8`},
        {run: 'sent no booking status notification and monthly billing ones', notifications: {[BOOKING_STATUS]: {sent: 0}, [MONTHLY_BILLING]: {sent: 3}}, line: `${symbol[MONTHLY_BILLING]} 3`},
        {run: 'sent booking status and chef deadlines notifications', notifications: {[BOOKING_STATUS]: {sent: 8}, [CHEF_DEADLINES]: {sent: 2}}, line: `${symbol[BOOKING_STATUS]} 8, ${symbol[CHEF_DEADLINES]} 2`},
        {run: 'sent no notification', notifications: {[BOOKING_STATUS]: {sent: 0}}, line: none},
        {run: 'counted no sender event, as a run before the counts', notifications: {}, line: none}
    ])('GIVEN a run that $run WHEN its stats format THEN the notifications line reads $line', ({notifications, line}) => {
        const stats = formatDailyMaintenanceStats(OrderFactory.defaultDailyMaintenanceResult({notifications}))

        expect(stat(stats, NOTIFICATION_COUNT_WORDS.label)).toBe(line)
    })
})

describe('jobRunStats for MONTHLY_BILLING', () => {
    it.each([
        ['a run stored before periods existed', JSON.stringify({results: [billed]}), '0'],
        ['a run with a period still behind', JSON.stringify({results: [billed], periods: [BillingFactory.defaultPeriodSideEffects({csvUploaded: false})]}), '1']
    ])('reads %s', (_name, stored, pending) => {
        const stats = jobRunStats(JobType.MONTHLY_BILLING, stored)

        expect(stat(stats, 'Perioder')).toBe('1')
        expect(stat(stats, 'Afventer')).toBe(pending)
    })

    it('renders the side effects in the job-run line', () => {
        const stored = JSON.stringify({results: [], periods: [BillingFactory.defaultPeriodSideEffects({archive: {key: 'k', filename: 'f', sizeBytes: 1, version: 1, archived: true, degraded: false}})]})

        expect(formatResultSummary(JobType.MONTHLY_BILLING, stored)).toContain('CSV uploadet: 1')
    })
})

// A run whose result cannot be read shows a dash in the job history; a job without stats shows its stored JSON
describe('formatResultSummary', () => {
    it.each([
        {stored: 'no result', jobType: JobType.DAILY_MAINTENANCE, resultSummary: null},
        {stored: 'a result that is not JSON', jobType: JobType.HEYNABO_IMPORT, resultSummary: '{'},
        {stored: 'a result its job\'s schema does not read', jobType: JobType.MONTHLY_BILLING, resultSummary: JSON.stringify({periods: []})},
        {stored: 'no result on a job without stats', jobType: JobType.MAINTENANCE_EXPORT, resultSummary: null}
    ])('GIVEN a run with $stored WHEN its result formats THEN it reads a dash', ({jobType, resultSummary}) => {
        expect(formatResultSummary(jobType, resultSummary)).toBe('-')
    })

    it('GIVEN a run of a job without stats WHEN its result formats THEN it reads the stored JSON', () => {
        const stored = JSON.stringify({imported: 3})

        expect(formatResultSummary(JobType.MAINTENANCE_IMPORT, stored)).toBe(stored)
    })
})
