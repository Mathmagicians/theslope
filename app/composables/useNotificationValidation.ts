/**
 * Notification validation — the app's view of the sender contract (ADR-001 validation layer).
 *
 * The queue contract is owned by the sender (`workers/sender/contract.ts`, zod only) and re-exported
 * here so application code imports it from a validation composable, never from the worker directly.
 * Isomorphic (ADR-017): explicit imports only, imported by server routes and utils.
 */
import {z} from 'zod'
import {
    NotificationMessageSchema,
    EmailMessageSchema,
    SmsMessageSchema,
    EmailAddressSchema,
    EnvironmentSchema,
    KindSchema,
    CONTRACT_VERSION,
    type NotificationMessage,
    type EmailMessage,
    type SmsMessage
} from '~~/workers/sender/contract'

export type NotificationEnvironment = z.infer<typeof EnvironmentSchema>

/** Body of POST /api/admin/sender/event/monthly-billing — re-sends the accountant mail for one period */
const SenderEventMonthlyBillingBodySchema = z.object({
    billingPeriodSummaryId: z.number().int().positive()
})

const OptionalEmailSchema = z.union([EmailAddressSchema, z.literal('')])

/**
 * The deployment a notification comes from, derived from its URL (DEPLOY_URL, else the request origin):
 * `site` = the host; environment = the host's first label when it names one (`dev.` → dev), `local` for a bare
 * host or a loopback address, `prod` for everything else (`www.`, the apex).
 */
export const deploymentFromUrl = (url: string): {environment: NotificationEnvironment, site: string} => {
    const {host, hostname} = new URL(url)
    const label = EnvironmentSchema.safeParse(hostname.split('.')[0])
    const isLocalHost = !hostname.includes('.') || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)
    return {environment: isLocalHost ? 'local' : label.success ? label.data : 'prod', site: host}
}

/** The NUXT_NOTIFICATIONS_* variable behind each configured mailbox, for the log line when one is unset */
export const NOTIFICATION_ADDRESS_VARS = {
    accountantEmail: 'NUXT_NOTIFICATIONS_ACCOUNTANT_EMAIL',
    adminEmail: 'NUXT_NOTIFICATIONS_ADMIN_EMAIL'
} as const

/** One e-mail template of app.config `theslope.notifications.templates`, keyed by kind */
const NotificationTemplateSchema = z.object({
    subject: z.string().min(1).max(200),
    text: z.string().min(1)
})

/**
 * What the app knows about sending: the deployment, sender address and display name (derived from DEPLOY_URL),
 * the mailboxes (runtimeConfig.notifications — NUXT_NOTIFICATIONS_* worker secrets), templates and signature (app.config).
 */
const NotificationConfigSchema = z.object({
    environment: EnvironmentSchema,
    /** The sending site, in signatures and links: dev.skraaningen.dk / www.skraaningen.dk / localhost:3000 */
    site: z.string().min(1),
    from: EmailAddressSchema,
    fromName: z.string().min(1).max(100),
    accountantEmail: OptionalEmailSchema,
    /** Reply-To of every mail, recipient of the test mail, cc on the accountant mail */
    adminEmail: OptionalEmailSchema,
    signature: z.string().min(1),
    templates: z.record(KindSchema, NotificationTemplateSchema)
})

/** Result of putting one message on the sender queue (operation result, ADR-009) */
const SenderEmitResultSchema = z.object({
    queued: z.boolean(),
    dedupeKey: z.string(),
    /** true when the SENDER binding is missing in this environment: the message is dropped and the caller continues */
    degraded: z.boolean()
})

export type SenderEventMonthlyBillingBody = z.infer<typeof SenderEventMonthlyBillingBodySchema>
export type NotificationConfig = z.infer<typeof NotificationConfigSchema>
export type SenderEmitResult = z.infer<typeof SenderEmitResultSchema>
export type {NotificationMessage, EmailMessage, SmsMessage}

export const useNotificationValidation = () => ({
    CONTRACT_VERSION,
    NotificationMessageSchema,
    EmailMessageSchema,
    SmsMessageSchema,
    EmailAddressSchema,
    EnvironmentSchema,
    KindSchema,
    SenderEventMonthlyBillingBodySchema,
    NotificationConfigSchema,
    SenderEmitResultSchema
})
