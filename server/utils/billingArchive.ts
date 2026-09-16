/**
 * Durable copy of a period's PBS CSV in R2 (bucket theslope-archive-{dev,prod}; miniflare under nuxt dev).
 * Never throws and overwrites on re-run (ADR-015): billing success never depends on the archive.
 */
import {useBillingValidation, type BillingArchiveResult, type BillingPeriodSummaryDetail} from '~/composables/useBillingValidation'

const {generateBillingCsv, generateCsvFilename} = useBillingValidation()
const LOG = '💰 > BILLING > [ARCHIVE]'
const CONTENT_TYPE = 'text/csv; charset=utf-8'

/** ASCII key per period month — billingPeriod's `dd/MM/yyyy-dd/MM/yyyy` contains slashes and is not a key */
export const getBillingArchiveKey = (cutoffDate: Date): string => {
    const month = cutoffDate.toISOString().slice(0, 7)
    return `billing/${month}/pbs-opgoerelse-${month}.csv`
}

export const archiveBillingCsv = async (bucket: R2Bucket | undefined, summary: BillingPeriodSummaryDetail, jobRunId?: number): Promise<BillingArchiveResult> => {
    const key = getBillingArchiveKey(summary.cutoffDate)
    const filename = generateCsvFilename(summary)
    const csv = generateBillingCsv(summary)
    const result = {key, filename, sizeBytes: Buffer.byteLength(csv, 'utf8')}

    if (!bucket) {
        console.warn(`${LOG} ARCHIVE binding missing — CSV not archived`, {key})
        return {...result, archived: false, degraded: true}
    }
    try {
        await bucket.put(key, csv, {
            httpMetadata: {contentType: CONTENT_TYPE},
            customMetadata: {billingPeriod: summary.billingPeriod, filename, ...(jobRunId === undefined ? {} : {jobRunId: String(jobRunId)})}
        })
        console.info(`${LOG} archived`, {key, sizeBytes: result.sizeBytes})
        return {...result, archived: true, degraded: false}
    } catch (error) {
        console.error(`${LOG} put failed`, {key, reason: error instanceof Error ? error.message : String(error)})
        return {...result, archived: false, degraded: false}
    }
}
