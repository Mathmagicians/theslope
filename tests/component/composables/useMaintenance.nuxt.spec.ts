import {describe, expect, it} from 'vitest'
import {useMaintenance} from '~/composables/useMaintenance'
import {useMaintenanceValidation} from '~/composables/useMaintenanceValidation'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'

const {formatMonthlyBillingStats, parseResultSummary, formatResultSummary} = useMaintenance()
const {JobType} = useMaintenanceValidation()

const billed = {billingPeriodSummaryId: 8, billingPeriod: '18/08/2026-17/09/2026', invoiceCount: 3, transactionCount: 12, totalAmount: 41230}
const stat = (stats: Array<{label: string, value: string}>, label: string) => stats.find(s => s.label === label)?.value

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

describe('parseResultSummary for MONTHLY_BILLING', () => {
    it.each([
        ['a run stored before periods existed', JSON.stringify({results: [billed]}), 0],
        ['a run with period states', JSON.stringify({results: [billed], periods: [BillingFactory.defaultPeriodSideEffects()]}), 1]
    ])('parses %s', (_name, stored, periodCount) => {
        const parsed = parseResultSummary(JobType.MONTHLY_BILLING, stored) as {results: unknown[], periods: unknown[]}

        expect(parsed.results).toHaveLength(1)
        expect(parsed.periods).toHaveLength(periodCount)
    })

    it('renders the side effects in the job-run line', () => {
        const stored = JSON.stringify({results: [], periods: [BillingFactory.defaultPeriodSideEffects({archive: {key: 'k', filename: 'f', sizeBytes: 1, version: 1, archived: true, degraded: false}})]})

        expect(formatResultSummary(JobType.MONTHLY_BILLING, stored)).toContain('CSV uploadet: 1')
    })
})
