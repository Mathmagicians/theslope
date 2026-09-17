/**
 * Durable copy of a period's PBS CSV in R2 (bucket theslope-archive-{dev,prod}; miniflare under nuxt dev).
 * One object per period version: the bucket listing is the audit trail of what the accountant received.
 * Returns a result in every case, so billing completes independently of the archive.
 */
import {useBillingValidation, type BillingArchiveResult, type BillingPeriodSummaryDetail} from '~/composables/useBillingValidation'

const {generateBillingCsv, generateCsvFilename} = useBillingValidation()
const LOG = '💰 > BILLING > [ARCHIVE]'
const CONTENT_TYPE = 'text/csv; charset=utf-8'

/** ASCII key from the cutoff month and the version (billingPeriod's `dd/MM/yyyy-dd/MM/yyyy` carries slashes) */
export const getBillingArchiveKey = (cutoffDate: Date, version: number): string => {
    const month = cutoffDate.toISOString().slice(0, 7)
    return `billing/${month}/pbs-opgoerelse-${month}-v${version}.csv`
}

export const archiveBillingCsv = async (bucket: R2Bucket | undefined, summary: BillingPeriodSummaryDetail, jobRunId?: number): Promise<BillingArchiveResult> => {
    const key = getBillingArchiveKey(summary.cutoffDate, summary.version)
    const filename = generateCsvFilename(summary)
    const csv = generateBillingCsv(summary)
    const result = {key, filename, sizeBytes: Buffer.byteLength(csv, 'utf8'), version: summary.version}

    if (!bucket) {
        console.warn(`${LOG} ARCHIVE binding missing — CSV not archived`, {key})
        return {...result, archived: false, degraded: true}
    }
    try {
        await bucket.put(key, csv, {
            httpMetadata: {contentType: CONTENT_TYPE},
            customMetadata: {billingPeriod: summary.billingPeriod, version: String(summary.version), filename, ...(jobRunId === undefined ? {} : {jobRunId: String(jobRunId)})}
        })
        console.info(`${LOG} archived`, {key, sizeBytes: result.sizeBytes})
        return {...result, archived: true, degraded: false}
    } catch (error) {
        console.error(`${LOG} put failed`, {key, reason: error instanceof Error ? error.message : String(error)})
        return {...result, archived: false, degraded: false}
    }
}
