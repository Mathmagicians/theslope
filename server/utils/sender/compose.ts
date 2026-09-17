/**
 * One e-mail from one template: fills the kind's template with the event's values plus the built-ins
 * (site, environment, dedupeKey), appends the signature, encodes text attachments, sets the admin mailbox
 * as Reply-To — a complete, contract-valid message for the SENDER queue.
 */
import {fillTemplate, templatePlaceholders} from '~/utils/template'
import {maskEmail} from '~~/workers/common/mask'
import {NOTIFICATION_ADDRESS_VARS, type EmailMessage, type NotificationConfig} from '~/composables/useNotificationValidation'

export type TextAttachment = {
    filename: string
    contentType: string
    /** UTF-8 text; base64-encoded here */
    content: string
}

export type ComposeInput = {
    kind: string
    to: string
    cc?: string[]
    values?: Record<string, string>
    attachments?: TextAttachment[]
    /** jobRunId / billingPeriod — an id or a period label */
    correlationId?: string
    now?: Date
}

const toBase64 = (utf8: string): string => Buffer.from(utf8, 'utf8').toString('base64')

/** The variable an event is missing before it can send (its recipient's mailbox), or null */
export const missingAddress = (config: NotificationConfig, recipient: 'adminEmail' | 'accountantEmail'): string | null =>
    config[recipient] ? null : NOTIFICATION_ADDRESS_VARS[recipient]

export const composeEmail = (config: NotificationConfig, input: ComposeInput): EmailMessage => {
    const {kind, to, cc = [], values = {}, attachments = [], correlationId, now = new Date()} = input
    const template = config.templates[kind]
    if (!template) throw new Error(`No notification template for kind ${kind}`)

    const placeholders = new Set([template.subject, template.text, config.signature].flatMap(templatePlaceholders))
    const unused = Object.keys(values).filter(name => !placeholders.has(name))
    if (unused.length > 0) throw new Error(`Template ${kind} has no placeholder for: ${unused.join(', ')}`)

    // {kind}:{channel}:{maskedRecipient}:{messageId} — one grep on the masked address finds every send to that mailbox
    const dedupeKey = `${kind}:EMAIL:${maskEmail(to)}:${crypto.randomUUID()}`
    const allValues = {...values, site: config.site, environment: config.environment, dedupeKey}

    return {
        v: 1,
        channel: 'EMAIL',
        to,
        cc,
        from: config.from,
        fromName: config.fromName,
        ...(config.adminEmail ? {replyTo: config.adminEmail} : {}),
        subject: fillTemplate(template.subject, allValues),
        text: `${fillTemplate(template.text, allValues)}\n\n${fillTemplate(config.signature, allValues)}`,
        attachments: attachments.map(({filename, contentType, content}) => ({filename, contentType, contentBase64: toBase64(content)})),
        meta: {
            kind,
            dedupeKey,
            source: 'theslope-app',
            environment: config.environment,
            enqueuedAt: now.toISOString(),
            ...(correlationId === undefined ? {} : {correlationId})
        }
    }
}
