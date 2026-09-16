/**
 * Sender event `test`: one real e-mail to a chosen mailbox, proving the pipe end to end.
 * Called by its HTTP twin (POST /api/admin/sender/event/test); the same function serves any
 * future trigger of a test mail.
 */
import {emit} from '~~/server/utils/sender/emit'
import {maskEmail} from '~~/workers/common/mask'
import type {EmailMessage, NotificationEnvironment, SenderEmitResult} from '~/composables/useNotificationValidation'

export type TestEmailInput = {
    to: string
    replyTo?: string
    from: string
    fromName: string
    /** The sending site, shown in the signature: dev.skraaningen.dk / www.skraaningen.dk */
    site: string
    environment: NotificationEnvironment
    now?: Date
}

export const buildTestEmail = ({to, replyTo, from, fromName, site, environment, now = new Date()}: TestEmailInput): EmailMessage => {
    const enqueuedAt = now.toISOString()
    // {kind}:{channel}:{maskedRecipient}:{messageId} — one grep on the masked address finds every send to that mailbox
    const dedupeKey = `TEST:EMAIL:${maskEmail(to)}:${crypto.randomUUID()}`
    return {
        v: 1,
        channel: 'EMAIL',
        to,
        from,
        fromName,
        ...(replyTo === undefined ? {} : {replyTo}),
        subject: `Skråningen: testbesked fra theslope-sender (${environment})`,
        text: `Hej!\n\nDette er en testbesked sendt gennem theslope-sender.\n\n— Skråningen · ${site}\nid: ${dedupeKey}`,
        attachments: [],
        meta: {
            kind: 'TEST',
            dedupeKey,
            source: 'theslope-app',
            environment,
            enqueuedAt
        }
    }
}

export const emitTestEmail = (queue: Queue | undefined, input: TestEmailInput): Promise<SenderEmitResult> =>
    emit(queue, buildTestEmail(input))
