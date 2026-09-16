import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {archiveBillingCsv, getBillingArchiveKey} from '~~/server/utils/billingArchive'
import {useBillingValidation} from '~/composables/useBillingValidation'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'

const {generateBillingCsv, generateCsvFilename} = useBillingValidation()
const summary = BillingFactory.defaultSummaryData('archive')
const fakeBucket = (put = vi.fn().mockResolvedValue(undefined)) => ({bucket: {put} as unknown as R2Bucket, put})

describe('getBillingArchiveKey', () => {
    it.each([
        [new Date('2026-08-17T00:00:00Z'), 'billing/2026-08/pbs-opgoerelse-2026-08.csv'],
        [new Date('2026-12-17T12:00:00Z'), 'billing/2026-12/pbs-opgoerelse-2026-12.csv']
    ])('keys the cutoff %s under its month, ASCII only', (cutoffDate, expected) => {
        expect(getBillingArchiveKey(cutoffDate)).toBe(expected)
    })
})

describe('archiveBillingCsv', () => {
    const logs = {warn: vi.spyOn(console, 'warn'), error: vi.spyOn(console, 'error'), info: vi.spyOn(console, 'info')}
    beforeEach(() => Object.values(logs).forEach(spy => spy.mockImplementation(() => {})))
    afterEach(() => Object.values(logs).forEach(spy => spy.mockClear()))

    it('puts the period CSV under its key with content type and the PBS filename as metadata', async () => {
        const {bucket, put} = fakeBucket()

        const result = await archiveBillingCsv(bucket, summary, 42)

        expect(result).toMatchObject({key: getBillingArchiveKey(summary.cutoffDate), filename: generateCsvFilename(summary), archived: true, degraded: false})
        expect(result.sizeBytes).toBe(Buffer.byteLength(generateBillingCsv(summary), 'utf8'))
        expect(put).toHaveBeenCalledWith(result.key, generateBillingCsv(summary), expect.objectContaining({
            httpMetadata: {contentType: 'text/csv; charset=utf-8'},
            customMetadata: expect.objectContaining({billingPeriod: summary.billingPeriod, filename: result.filename, jobRunId: '42'})
        }))
    })

    it('reports degraded without a binding', async () => {
        const result = await archiveBillingCsv(undefined, summary)

        expect(result).toMatchObject({archived: false, degraded: true})
        expect(logs.warn).toHaveBeenCalledOnce()
    })

    it('never throws when the put fails — billing must not depend on the archive', async () => {
        const {bucket} = fakeBucket(vi.fn().mockRejectedValue(new Error('R2 down')))

        const result = await archiveBillingCsv(bucket, summary)

        expect(result).toMatchObject({archived: false, degraded: false})
        expect(logs.error).toHaveBeenCalledOnce()
    })
})
