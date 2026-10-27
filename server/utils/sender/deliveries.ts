/**
 * The delivery step every sender event shares. With e-mail off it loads nothing and answers the missing setting.
 * Otherwise it loads the deliveries the sender event's data sends, drops the channels each user opted out of, reads their
 * recorded rows, one chunked read per subject type (ADR-014), unless the sender event read them already, sends what no
 * recorded row covers in one emit and records what the queue took in one write.
 * A configured mailbox has no user and no channels to opt out of. A delivery dry run takes the same path and stops
 * before the send.
 */
import type {H3Event} from 'h3'
import {composeEmail, type TextAttachment} from '~~/server/utils/sender/compose'
import {emit} from '~~/server/utils/sender/emit'
import type {EmailChannel, EmailSetting} from '~~/server/utils/sender/config'
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
    /** The setting e-mail misses while it is off */
    missing?: EmailSetting
}

/** A sender event's deliveries, with the recorded rows of their subjects when the sender event read them */
export interface LoadedDeliveries {
    desired: DesiredOutgoing[]
    recorded?: Delivery[]
}

/** The one empty result: nothing sent, naming the setting e-mail misses while it is off */
export const nothingSent = (missing?: DeliveryResult['missing']): DeliveryResult => ({counts: {sent: 0}, missing})

type ToUser = DesiredOutgoing & {userId: number}

const isToUser = (delivery: DesiredOutgoing): delivery is ToUser => delivery.userId !== null

const wantsEmail = (delivery: DesiredOutgoing): boolean => !isToUser(delivery) || wantsChannel(delivery, NotificationChannelSchema.enum.EMAIL)

// A delivery once, however often the sender event's data names it
const once = (desired: DesiredOutgoing[]): DesiredOutgoing[] => [...new Map(desired.map(delivery =>
    [`${delivery.subjectType}:${delivery.subjectId}:v${delivery.version}:${delivery.notification}:${delivery.userId ?? delivery.to}`, delivery])).values()]

/** What a notification is about, as its Delivery row names it */
export interface NotificationSubject {
    subjectType: Delivery['subjectType']
    subjectId: number
}

// The recorded rows of the subjects, the subject types read one after another (ADR-014)
export const readRecorded = async (d1Client: D1Database, subjects: NotificationSubject[]): Promise<Delivery[]> => {
    const rows: Delivery[] = []
    for (const [subjectType, ofType] of groupBy<NotificationSubject, Delivery['subjectType']>(subject => subject.subjectType)(subjects)) {
        rows.push(...await fetchDeliveries(d1Client, subjectType, [...new Set(ofType.map(subject => subject.subjectId))]))
    }
    return rows
}

type NotificationCounts = DeliveryDryRun['users'][number]['toSend']

const countByNotification = (deliveries: DesiredDelivery[]): NotificationCounts =>
    deliveries.reduce<NotificationCounts>((counts, {notification}) => ({...counts, [notification]: (counts[notification] ?? 0) + 1}), {})

/** A delivery with the count of the recorded rows that cover it */
type Covered = {delivery: DesiredOutgoing, covering: number}

// Two runs on one dinner raced when two recorded rows cover one user's delivery; a mailbox's goes again on the admin's re-send
const warnSentTwice = (covered: Covered[]): void => {
    for (const {delivery, covering} of covered) {
        if (isToUser(delivery) && covering > 1) {
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
    d1Client: D1Database, channel: EmailChannel, senderEvent: SenderEvent, load: (config: NotificationConfig) => Promise<LoadedDeliveries>,
    {jobRunId, adminOverride, dryRun}: DeliveryOptions = {}
): Promise<DeliveryResult> => {
    if (!channel.on) {
        console.error(`${LOG} [EVENT ${senderEvent}] e-mail is off (${channel.missing} not set): nothing sent`)
        return nothingSent(channel.missing)
    }
    try {
        const loaded = await load(channel.config)
        const onChannel = once(loaded.desired).filter(wantsEmail)
        const recorded = loaded.recorded ?? await readRecorded(d1Client, onChannel)
        const covered = onChannel.map(delivery => ({delivery, covering: coveringDeliveries(recorded, delivery, EMAIL).length}))
        const sending = covered.filter(({covering}) => shouldSend(covering, adminOverride !== undefined)).map(({delivery}) => delivery)
        if (dryRun) return {counts: {sent: sending.length}, dryRun: dryRunOf(senderEvent, sending)}

        warnSentTwice(covered)
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
