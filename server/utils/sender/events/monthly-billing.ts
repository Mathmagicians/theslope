/**
 * Sender event `monthly-billing`: the period's PBS CSV to the accountant, cc the admin mailbox —
 * BILLING_PERIOD_CLOSED for a period's first version, BILLING_PERIOD_UPDATED (subject "opdatering v<n>",
 * replaces the earlier mail) for every later one. Raised by runMonthlyBilling and re-sent by its HTTP twin
 * (POST /api/admin/sender/event/monthly-billing).
 */
import {channelOff, emit, notSent} from '~~/server/utils/sender/emit'
import type {EmailChannel} from '~~/server/utils/sender/config'
import {composeEmail, missingAddress, siteUrl} from '~~/server/utils/sender/compose'
import {useBillingValidation, type BillingPeriodSummaryDetail} from '~/composables/useBillingValidation'
import type {EmailMessage, NotificationConfig, SenderEmitResult} from '~/composables/useNotificationValidation'

const {generateBillingCsv, generateCsvFilename} = useBillingValidation()
const LOG = '📮 > SENDER > [EVENT monthly-billing]'

const formatKroner = (oere: number): string =>
    (oere / 100).toLocaleString('da-DK', {minimumFractionDigits: 2, maximumFractionDigits: 2})

export const billingMailKind = (version: number): 'BILLING_PERIOD_CLOSED' | 'BILLING_PERIOD_UPDATED' =>
    version > 1 ? 'BILLING_PERIOD_UPDATED' : 'BILLING_PERIOD_CLOSED'

export const buildBillingPeriodClosedEmail = (config: NotificationConfig, summary: BillingPeriodSummaryDetail, now?: Date): EmailMessage => {
    const kind = billingMailKind(summary.version)
    return composeEmail(config, {
        kind,
        to: config.accountantEmail,
        cc: config.adminEmail ? [config.adminEmail] : [],
        values: {
            billingPeriod: summary.billingPeriod,
            householdCount: String(summary.householdCount),
            totalAmount: formatKroner(summary.totalAmount),
            summaryUrl: siteUrl(config, `/public/billing/${summary.shareToken}`),
            ...(kind === 'BILLING_PERIOD_UPDATED' ? {version: String(summary.version)} : {})
        },
        attachments: [{filename: generateCsvFilename(summary), contentType: 'text/csv; charset=utf-8', content: generateBillingCsv(summary)}],
        correlationId: `${summary.billingPeriod} v${summary.version}`,
        now
    })
}

export const emitBillingPeriodClosed = (channel: EmailChannel, summary: BillingPeriodSummaryDetail): Promise<SenderEmitResult> => {
    if (!channel.on) return channelOff(billingMailKind(summary.version), channel.missing, summary.billingPeriod)
    const {queue, config} = channel
    const missing = missingAddress(config, 'accountantEmail')
    if (missing) {
        console.warn(`${LOG} ${missing} not set — mail not sent`, {billingPeriod: summary.billingPeriod, version: summary.version})
        return notSent(billingMailKind(summary.version), 'unconfigured', summary.billingPeriod)
    }
    return emit(queue, buildBillingPeriodClosedEmail(config, summary))
}
