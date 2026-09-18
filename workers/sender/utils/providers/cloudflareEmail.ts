/**
 * Cloudflare Email Service adapter — the only module that touches `env.EMAIL`.
 *
 * Email Service is in public beta: if the binding's signature or error codes drift,
 * this file is the whole blast radius (a Resend swap is one adapter + one secret).
 */
import type {EmailMessage} from '~/contract'
import {RetryableError, TerminalError} from '~/utils/delivery'
import type {DeliveryResult, EmailProvider} from '~/utils/providers/types'

/** The retryable codes of the Email Service; every other `E_*` code is terminal. */
const RETRYABLE_CODES: readonly string[] = ['E_RATE_LIMIT_EXCEEDED', 'E_DAILY_LIMIT_EXCEEDED', 'E_INTERNAL_SERVER_ERROR']

/** A throw without an `E_*` code is a transport failure (TypeError from fetch), not a rejected message. */
const NETWORK_CODE = 'E_NETWORK'

const errorCode = (error: unknown): string | undefined => {
    const code = (error as {code?: unknown} | null)?.code
    return typeof code === 'string' ? code : undefined
}

/** The contract carries attachments as base64 (JSON-safe); the binding takes bytes — a string would be sent as the file's text */
const decodeBase64 = (base64: string): Uint8Array => Uint8Array.from(atob(base64), character => character.charCodeAt(0))

const toBindingMessage = (msg: EmailMessage): EmailMessageBuilder => ({
    from: msg.fromName === undefined ? msg.from : {email: msg.from, name: msg.fromName},
    to: msg.toName === undefined ? msg.to : {email: msg.to, name: msg.toName},
    ...(msg.cc.length === 0 ? {} : {cc: msg.cc}),
    ...(msg.replyTo === undefined ? {} : {replyTo: msg.replyTo}),
    subject: msg.subject,
    text: msg.text,
    ...(msg.html === undefined ? {} : {html: msg.html}),
    attachments: msg.attachments.map(attachment => ({
        content: decodeBase64(attachment.contentBase64),
        filename: attachment.filename,
        type: attachment.contentType,
        disposition: 'attachment'
    }))
})

export const createCloudflareEmailProvider = (binding: SendEmail): EmailProvider => ({
    send: async (msg: EmailMessage): Promise<DeliveryResult> => {
        try {
            const {messageId} = await binding.send(toBindingMessage(msg))
            return {providerMessageId: messageId}
        } catch (error) {
            const code = errorCode(error)
            const message = error instanceof Error ? error.message : String(error)
            if (code === undefined) throw new RetryableError(NETWORK_CODE, message)
            if (RETRYABLE_CODES.includes(code)) throw new RetryableError(code, message)
            throw new TerminalError(code, message)
        }
    }
})
