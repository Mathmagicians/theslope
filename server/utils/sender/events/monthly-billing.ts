/**
 * Sender event `monthly-billing` (kind BILLING_PERIOD_CLOSED): the period's PBS CSV to the accountant,
 * cc the admin mailbox. Raised by runMonthlyBilling (cron and /api/admin/maintenance/monthly) and
 * re-sent by its HTTP twin (POST /api/admin/sender/event/monthly-billing).
 */
import {emit} from '~~/server/utils/sender/emit'
import {composeEmail, missingAddress} from '~~/server/utils/sender/compose'
import {useBillingValidation, type BillingPeriodSummaryDetail} from '~/composables/useBillingValidation'
import type {EmailMessage, NotificationConfig, SenderEmitResult} from '~/composables/useNotificationValidation'

const {generateBillingCsv, generateCsvFilename} = useBillingValidation()
const KIND = 'BILLING_PERIOD_CLOSED'
const LOG = `📮 > SENDER > [EVENT ${KIND}]`

const formatKroner = (oere: number): string =>
    (oere / 100).toLocaleString('da-DK', {minimumFractionDigits: 2, maximumFractionDigits: 2})

export const buildBillingPeriodClosedEmail = (config: NotificationConfig, summary: BillingPeriodSummaryDetail, now?: Date): EmailMessage =>
    composeEmail(config, {
        kind: KIND,
        to: config.accountantEmail,
        cc: config.adminEmail ? [config.adminEmail] : [],
        values: {
            billingPeriod: summary.billingPeriod,
            householdCount: String(summary.householdCount),
            totalAmount: formatKroner(summary.totalAmount),
            summaryUrl: `https://${config.site}/public/billing/${summary.shareToken}`
        },
        attachments: [{filename: generateCsvFilename(summary), contentType: 'text/csv; charset=utf-8', content: generateBillingCsv(summary)}],
        correlationId: summary.billingPeriod,
        now
    })

export const emitBillingPeriodClosed = (queue: Queue | undefined, config: NotificationConfig, summary: BillingPeriodSummaryDetail): Promise<SenderEmitResult> => {
    const missing = missingAddress(config, 'accountantEmail')
    if (missing) {
        console.warn(`${LOG} ${missing} not set — mail not sent`, {billingPeriod: summary.billingPeriod})
        return Promise.resolve({queued: false, dedupeKey: `${KIND}:EMAIL:unconfigured:${summary.billingPeriod}`, degraded: true})
    }
    return emit(queue, buildBillingPeriodClosedEmail(config, summary))
}
