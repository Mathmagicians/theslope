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

/** Body of POST /api/admin/sender/event/test */
const SenderEventTestBodySchema = z.object({
    to: EmailAddressSchema,
    replyTo: EmailAddressSchema.optional()
})

/** Result of putting one message on the sender queue (operation result, ADR-009) */
const SenderEmitResultSchema = z.object({
    queued: z.boolean(),
    dedupeKey: z.string(),
    /** true when the SENDER binding is missing in this environment — the message was dropped, the caller continues */
    degraded: z.boolean()
})

export type SenderEventTestBody = z.infer<typeof SenderEventTestBodySchema>
export type SenderEmitResult = z.infer<typeof SenderEmitResultSchema>
export type NotificationEnvironment = z.infer<typeof EnvironmentSchema>
export type {NotificationMessage, EmailMessage, SmsMessage}

export const useNotificationValidation = () => ({
    CONTRACT_VERSION,
    NotificationMessageSchema,
    EmailMessageSchema,
    SmsMessageSchema,
    EmailAddressSchema,
    EnvironmentSchema,
    KindSchema,
    SenderEventTestBodySchema,
    SenderEmitResultSchema
})
