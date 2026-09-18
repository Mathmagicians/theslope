/**
 * Put one message on the sender queue through the SENDER binding.
 *
 * Never throws: notification is a side effect of a business operation, and a missing or failing
 * queue must not fail that operation. The caller gets a result to log or return.
 */
import {useNotificationValidation, type SenderEmitResult} from '~/composables/useNotificationValidation'

const {NotificationMessageSchema} = useNotificationValidation()
const LOG = '📮 > SENDER > [EMIT]'

const dedupeKeyOf = (message: unknown): string =>
    (message as {meta?: {dedupeKey?: unknown}} | null)?.meta?.dedupeKey?.toString() ?? 'unknown'

export const emit = async (queue: Queue | undefined, message: unknown): Promise<SenderEmitResult> => {
    const dedupeKey = dedupeKeyOf(message)
    const parsed = NotificationMessageSchema.safeParse(message)
    if (!parsed.success) {
        console.error(`${LOG} message rejected by the contract`, {
            dedupeKey,
            issues: parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
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
