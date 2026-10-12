/**
 * Put one message on the sender queue through the SENDER binding.
 *
 * Never throws: notification is a side effect of a business operation, and a missing or failing
 * queue must not fail that operation. The caller gets a result to log or return.
 */
import {z} from 'zod'
import {useNotificationValidation, type SenderEmitResult} from '~/composables/useNotificationValidation'

const {NotificationMessageSchema} = useNotificationValidation()
const LOG = '📮 > SENDER > [EMIT]'

const dedupeKeyOf = (message: unknown): string =>
    (message as {meta?: {dedupeKey?: unknown}} | null)?.meta?.dedupeKey?.toString() ?? 'unknown'

// The result for a mail that is never composed (no recipient address, or a mailbox missing from the config); the operation goes on
export const notSent = (kind: string, reason: 'unaddressed' | 'unconfigured', subject?: string): Promise<SenderEmitResult> =>
    Promise.resolve({queued: false, dedupeKey: [kind, 'EMAIL', reason, subject].filter(part => part !== undefined).join(':'), degraded: true})

export const emit = async (queue: Queue | undefined, message: unknown): Promise<SenderEmitResult> => {
    const dedupeKey = dedupeKeyOf(message)
    const parsed = NotificationMessageSchema.safeParse(message)
    if (!parsed.success) {
        console.error(`${LOG} message rejected by the contract`, {
            dedupeKey,
            issues: z.prettifyError(parsed.error)
        })
        return {queued: false, dedupeKey, degraded: false}
    }
    if (!queue) {
        console.warn(`${LOG} SENDER binding missing — message dropped`, {dedupeKey})
        return {queued: false, dedupeKey, degraded: true}
    }
    try {
        await queue.send(parsed.data)
        console.info(`${LOG} queued`, {dedupeKey, kind: parsed.data.meta.kind, channel: parsed.data.channel})
        return {queued: true, dedupeKey, degraded: false}
    } catch (error) {
        console.error(`${LOG} queue send failed`, {dedupeKey, reason: error instanceof Error ? error.message : String(error)})
        return {queued: false, dedupeKey, degraded: false}
    }
}
