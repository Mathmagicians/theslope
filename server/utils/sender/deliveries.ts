/**
 * The delivery step every sender event shares. With e-mail off it loads nothing. Otherwise it loads the deliveries the
 * sender event's data sends, drops the channels each user opted out of, reads their recorded rows, one chunked read per
 * subject type (ADR-014), sends what no recorded row covers in one emit and records what the queue took in one write.
 * A configured mailbox has no user and no channels to opt out of. A delivery dry run takes the same path and stops
 * before the send.
 */
import type {H3Event} from 'h3'
import {composeEmail, type TextAttachment} from '~~/server/utils/sender/compose'
import {emit} from '~~/server/utils/sender/emit'
import type {EmailChannel} from '~~/server/utils/sender/config'
import type {NotificationConfig, SenderEmitResult} from '~/composables/useNotificationValidation'
import {
    useDeliveryValidation, type Delivery, type DeliveryCounts, type DeliveryCreate, type DeliveryDryRun, type SenderEvent, type DesiredDelivery
} from '~/composables/useDeliveryValidation'
import {useUserPreferenceValidation, wantsChannel, type NotificationChannel} from '~/composables/useUserPreferenceValidation'
import {fetchDeliveries, recordDeliveries} from '~~/server/data/financesRepository'
import {groupBy} from '~/utils/batchUtils'

const LOG = '📬 > DELIVERY >'

const {DeliveryKindSchema, coveringDeliveries, shouldSend} = useDeliveryValidation()
const {NotificationChannelSchema} = useUserPreferenceValidation()
const {EMAIL} = DeliveryKindSchema.enum

/** A desired delivery as a sender event hands it over: the address, the user's channels, its template's values and the mail's copies and attachments */
export type DesiredOutgoing = DesiredDelivery & {
    to: string
    notificationChannels: NotificationChannel[]
    values: (config: NotificationConfig) => Record<string, string>
    cc?: string[]
    attachments?: TextAttachment[]
    correlationId?: string
}

export interface DeliveryOptions {
    jobRunId?: number
    /** The admin re-sends: a delivery goes whatever the recorded rows say */
    adminOverride?: {adminUserId: number}
    /** The delivery dry run stops before the send: per user, how many of each notification the run sends */
    dryRun?: boolean
}

export interface DeliveryResult {
    counts: DeliveryCounts
    /** The queue's answer per delivery handed to it, empty when nothing goes; absent with e-mail off and in a delivery dry run */
    emitted?: SenderEmitResult[]
    dryRun?: DeliveryDryRun
}

type ToUser = DesiredOutgoing & {userId: number}

const isToUser = (delivery: DesiredOutgoing): delivery is ToUser => delivery.userId !== null

const wantsEmail = (delivery: DesiredOutgoing): boolean => !isToUser(delivery) || wantsChannel(delivery, NotificationChannelSchema.enum.EMAIL)

// A delivery once, however often the sender event's data names it
const once = (desired: DesiredOutgoing[]): DesiredOutgoing[] => [...new Map(desired.map(delivery =>
    [`${delivery.subjectType}:${delivery.subjectId}:v${delivery.version}:${delivery.notification}:${delivery.userId ?? delivery.to}`, delivery])).values()]

// The recorded rows of the deliveries' subjects, the subject types read one after another (ADR-014)
const readRecorded = async (d1Client: D1Database, deliveries: DesiredDelivery[]): Promise<Delivery[]> => {
    const rows: Delivery[] = []
    for (const [subjectType, ofType] of groupBy<DesiredDelivery, Delivery['subjectType']>(delivery => delivery.subjectType)(deliveries)) {
        rows.push(...await fetchDeliveries(d1Client, subjectType, [...new Set(ofType.map(delivery => delivery.subjectId))]))
    }
    return rows
}

type NotificationCounts = DeliveryDryRun['users'][number]['toSend']

const countByNotification = (deliveries: DesiredDelivery[]): NotificationCounts =>
    deliveries.reduce<NotificationCounts>((counts, {notification}) => ({...counts, [notification]: (counts[notification] ?? 0) + 1}), {})

// Two runs on one dinner raced when two recorded rows cover one user's delivery; a mailbox's goes again on the admin's re-send
const warnSentTwice = (deliveries: ToUser[], recorded: Delivery[]): void => {
    for (const delivery of deliveries) {
        const covering = coveringDeliveries(recorded, delivery, EMAIL).length
        if (covering > 1) {
            console.warn(`${LOG} [SENT TWICE] ${delivery.notification} ${delivery.subjectType} ${delivery.subjectId} v${delivery.version} to user-${delivery.userId}: ${covering} recorded`)
        }
    }
}

// The deliveries a run sends, per user, with the count of each notification
const dryRunOf = (senderEvent: SenderEvent, sending: DesiredOutgoing[]): DeliveryDryRun => ({
    senderEvent,
    users: [...groupBy<ToUser, number>(delivery => delivery.userId)(sending.filter(isToUser))]
        .map(([userId, ofUser]) => ({userId, toSend: countByNotification(ofUser)}))
})

// The users an admin's re-send went to, by id, and the mailboxes by count
const recipientsOf = (sent: DesiredOutgoing[]): string => {
    const users = [...new Set(sent.filter(isToUser).map(delivery => delivery.userId))]
    const mailboxes = sent.length - sent.filter(isToUser).length
    return [users.length > 0 && `users ${users.join(', ')}`, mailboxes > 0 && `${mailboxes} mailbox(es)`].filter(Boolean).join(' and ')
}

// The deliveries composed and queued in one emit; the queued ones recorded in one write, each its dedupe key as reference
const send = async (
    d1Client: D1Database, channel: Extract<EmailChannel, {on: true}>, sending: DesiredOutgoing[], jobRunId?: number
): Promise<{sent: DesiredOutgoing[], emitted: SenderEmitResult[]}> => {
    const emitted = await emit(channel.queue, sending.map(delivery => composeEmail(channel.config, {
        kind: delivery.notification, to: delivery.to, userId: delivery.userId, cc: delivery.cc, values: delivery.values(channel.config),
        attachments: delivery.attachments, correlationId: delivery.correlationId
    })))
    const queued = sending.flatMap((delivery, index) => emitted[index]!.queued ? [{delivery, reference: emitted[index]!.dedupeKey}] : [])
    const rows: DeliveryCreate[] = queued.map(({delivery: {subjectType, subjectId, version}, reference}) => ({subjectType, subjectId, version, kind: EMAIL, reference, jobRunId}))
    if (rows.length > 0) await recordDeliveries(d1Client, rows)
    return {sent: queued.map(({delivery}) => delivery), emitted}
}

/**
 * A sender event's deliveries on the e-mail channel, loaded once the channel is on: sent where no recorded row covers
 * them, or counted by a delivery dry run. A failure of the load, the read or the send is its one failed line
 */
export const deliverDesired = async (
    d1Client: D1Database, channel: EmailChannel, senderEvent: SenderEvent, load: () => Promise<DesiredOutgoing[]>,
    {jobRunId, adminOverride, dryRun}: DeliveryOptions = {}
): Promise<DeliveryResult> => {
    if (!channel.on) {
        console.warn(`${LOG} [EVENT ${senderEvent}] e-mail is off (${channel.missing} not set): nothing sent`)
        return {counts: {sent: 0}}
    }
    try {
        const onChannel = once(await load()).filter(wantsEmail)
        const recorded = await readRecorded(d1Client, onChannel)
        warnSentTwice(onChannel.filter(isToUser), recorded)
        const sending = onChannel.filter(delivery => shouldSend(recorded, delivery, EMAIL, adminOverride !== undefined))
        if (dryRun) return {counts: {sent: sending.length}, dryRun: dryRunOf(senderEvent, sending)}

        const {sent, emitted} = await send(d1Client, channel, sending, jobRunId)
        if (adminOverride && sent.length > 0) {
            console.info(`${LOG} [EVENT ${senderEvent}] re-sent by admin ${adminOverride.adminUserId} to ${recipientsOf(sent)}`)
        }
        if (sent.length > 0) console.info(`${LOG} [EVENT ${senderEvent}] sent ${sent.length}`)
        return {counts: {sent: sent.length}, emitted}
    } catch (error) {
        console.error(`${LOG} [EVENT ${senderEvent}] failed: ${error instanceof Error ? error.message : String(error)}`)
        throw error
    }
}

/** The user does not wait for notifications: the work runs after the response, and its failure is its own log line */
export const deliverInBackground = (event: H3Event, work: () => Promise<unknown>): void => event.waitUntil(work().catch(() => undefined))
