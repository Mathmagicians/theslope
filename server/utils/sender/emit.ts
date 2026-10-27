/**
 * Put one message or a list of messages on the sender queue through the SENDER binding: the messages the contract
 * accepts go in batches of a hundred, the queue's limit per call, and each message gets its result, in input order.
 *
 * Never throws: notification is a side effect of a business operation, and a missing or failing
 * queue must not fail that operation. The caller gets the results to log or return.
 */
import {z} from 'zod'
import {useNotificationValidation, type NotificationMessage, type SenderEmitResult} from '~/composables/useNotificationValidation'
import {useDeliveryValidation} from '~/composables/useDeliveryValidation'
import type {NotificationKind} from '~/config/notificationTemplates'
import type {EmailSetting} from '~~/server/utils/sender/config'
import {chunkArray} from '~/utils/batchUtils'

const {NotificationMessageSchema} = useNotificationValidation()
const {DeliveryKindSchema, deliveryReferencePrefix} = useDeliveryValidation()
const {EMAIL} = DeliveryKindSchema.enum
const LOG = '📮 > SENDER > [EMIT]'

const dedupeKeyOf = (message: unknown): string =>
    (message as {meta?: {dedupeKey?: unknown}} | null)?.meta?.dedupeKey?.toString() ?? 'unknown'

// The queue takes at most a hundred messages per sendBatch
const chunkQueueBatch = chunkArray<{index: number, message: NotificationMessage}>(100)

// The result for a mail never composed because the config lacks a setting it needs; the operation goes on
export const notSent = (kind: NotificationKind, subject?: string): Promise<SenderEmitResult> =>
    Promise.resolve({queued: false, dedupeKey: `${deliveryReferencePrefix(kind, EMAIL, null)}unconfigured${subject === undefined ? '' : `:${subject}`}`, degraded: true})

// E-mail is off in this environment: the kind is logged with the missing setting and reported not sent
export const channelOff = (kind: NotificationKind, missing: EmailSetting): Promise<SenderEmitResult> => {
    console.error(`${LOG} e-mail is off (${missing} not set): ${kind} not sent`)
    return notSent(kind)
}

export const emit = async (queue: Queue | undefined, messages: NotificationMessage | NotificationMessage[]): Promise<SenderEmitResult[]> => {
    const all = [messages].flat()
    const results: SenderEmitResult[] = all.map(message => ({queued: false, dedupeKey: dedupeKeyOf(message), degraded: false}))
    const valid = all.flatMap((message, index) => {
        const parsed = NotificationMessageSchema.safeParse(message)
        if (parsed.success) return [{index, message: parsed.data}]
        console.error(`${LOG} message rejected by the contract`, {dedupeKey: results[index]!.dedupeKey, issues: z.prettifyError(parsed.error)})
        return []
    })
    if (valid.length === 0) return results
    if (!queue) {
        console.warn(`${LOG} SENDER binding missing — ${valid.length} message(s) dropped`, {dedupeKeys: valid.map(({index}) => results[index]!.dedupeKey)})
        for (const {index} of valid) results[index]!.degraded = true
        return results
    }
    for (const batch of chunkQueueBatch(valid)) {
        const dedupeKeys = batch.map(({index}) => results[index]!.dedupeKey)
        try {
            await queue.sendBatch(batch.map(({message}) => ({body: message})))
            for (const {index} of batch) results[index]!.queued = true
            console.info(`${LOG} queued ${batch.length} message(s)`, {kinds: [...new Set(batch.map(({message}) => message.meta.kind))], dedupeKeys})
        } catch (error) {
            console.error(`${LOG} queue batch failed — ${batch.length} message(s) not queued`, {dedupeKeys, reason: error instanceof Error ? error.message : String(error)})
        }
    }
    return results
}
