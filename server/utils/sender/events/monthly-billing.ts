/**
 * Sender event `monthly-billing`: the period's PBS CSV to the accountant, cc the admin mailbox —
 * BILLING_PERIOD_CLOSED for a period's first version, BILLING_PERIOD_UPDATED (subject "opdatering v<n>",
 * replaces the earlier mail) for every later one. The delivery step sends and records it; runMonthlyBilling raises
 * it and its HTTP twin (POST /api/admin/sender/event/monthly-billing) re-sends it.
 */
import {missingAddress, siteUrl} from '~~/server/utils/sender/compose'
import type {LoadedDeliveries} from '~~/server/utils/sender/deliveries'
import {useBillingValidation, type BillingPeriodSummaryDetail} from '~/composables/useBillingValidation'
import type {NotificationConfig} from '~/composables/useNotificationValidation'
import {useDeliveryValidation} from '~/composables/useDeliveryValidation'
import {useUserPreferenceValidation} from '~/composables/useUserPreferenceValidation'
import {NotificationKind} from '~/config/notificationTemplates'

const {generateBillingCsv, generateCsvFilename} = useBillingValidation()
const {DeliverySubjectSchema, SenderEventSchema} = useDeliveryValidation()
const {BILLING_PERIOD} = DeliverySubjectSchema.enum
const {NotificationChannelSchema} = useUserPreferenceValidation()
const LOG = `📮 > SENDER > [EVENT ${SenderEventSchema.enum.MONTHLY_BILLING}]`

const formatKroner = (oere: number): string =>
    (oere / 100).toLocaleString('da-DK', {minimumFractionDigits: 2, maximumFractionDigits: 2})

export const billingMailKind = (version: number): NotificationKind =>
    version > 1 ? NotificationKind.BILLING_PERIOD_UPDATED : NotificationKind.BILLING_PERIOD_CLOSED

/** The notifications a period's current version sends the accountant, cc the admin mailbox, with the CSV attached */
export const notificationsForAccountant = (summary: BillingPeriodSummaryDetail) => async (config: NotificationConfig): Promise<LoadedDeliveries> => {
    const missing = missingAddress(config, 'accountantEmail')
    if (missing) {
        console.error(`${LOG} ${missing} not set — mail not sent`, {billingPeriod: summary.billingPeriod, version: summary.version})
        return {desired: []}
    }
    const notification = billingMailKind(summary.version)
    return {desired: [{
        subjectType: BILLING_PERIOD, subjectId: summary.id, version: summary.version, notification, userId: null,
        to: config.accountantEmail, notificationChannels: [NotificationChannelSchema.enum.EMAIL],
        cc: config.adminEmail ? [config.adminEmail] : [],
        values: channelConfig => ({
            billingPeriod: summary.billingPeriod,
            householdCount: String(summary.householdCount),
            totalAmount: formatKroner(summary.totalAmount),
            summaryUrl: siteUrl(channelConfig, `/public/billing/${summary.shareToken}`),
            ...(notification === NotificationKind.BILLING_PERIOD_UPDATED ? {version: String(summary.version)} : {})
        }),
        attachments: [{filename: generateCsvFilename(summary), contentType: 'text/csv; charset=utf-8', content: generateBillingCsv(summary)}],
        correlationId: `${summary.billingPeriod} v${summary.version}`
    }]}
}
