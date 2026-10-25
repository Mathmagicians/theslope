/**
 * The delivery step every sender event shares. A sender event hands it the deliveries its data owes; the step reads
 * their recorded rows, one chunked read per subject type (ADR-014), drops the channels each user opted out of, sends
 * what no recorded row covers in one emit and records what the queue took in one write. A delivery dry run reads the
 * same and sends and records nothing.
 */
import type {H3Event} from 'h3'
import {composeEmail} from '~~/server/utils/sender/compose'
import {emit} from '~~/server/utils/sender/emit'
import type {EmailChannel} from '~~/server/utils/sender/config'
import type {NotificationConfig} from '~/composables/useNotificationValidation'
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

/** A desired delivery as a sender event hands it over: the user's address and channels, and its template's values */
export type DesiredOutgoing = DesiredDelivery & {
    to: string
    notificationChannels: NotificationChannel[]
    values: (config: NotificationConfig) => Record<string, string>
    correlationId?: string
}

export interface DeliveryOptions {
    jobRunId?: number
    /** The admin re-sends: a delivery goes whatever the recorded rows say */
    adminOverride?: {adminUserId: number}
    /**
     * The delivery dry run sends and records nothing: per user, how many of each notification would go and how many
     * are already recorded; it counts what the environment's email channel can send
     */
    dryRun?: boolean
}

export interface DeliveryResult {
    counts: DeliveryCounts
    dryRun?: DeliveryDryRun
}

type ToUser = DesiredOutgoing & {userId: number}

const isToUser = (delivery: DesiredOutgoing): delivery is ToUser => delivery.userId !== null

// A delivery once, however often the sender event's data names it
const once = (desired: DesiredOutgoing[]): DesiredOutgoing[] => [...new Map(desired.map(delivery =>
    [`${delivery.subjectType}:${delivery.subjectId}:v${delivery.version}:${delivery.notification}:${delivery.userId}`, delivery])).values()]

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

// Two runs on one dinner raced when two recorded rows cover one delivery
const warnSentTwice = (deliveries: ToUser[], recorded: Delivery[]): void => {
    for (const delivery of deliveries) {
        const covering = coveringDeliveries(recorded, delivery, EMAIL).length
        if (covering > 1) {
            console.warn(`${LOG} [SENT TWICE] ${delivery.notification} ${delivery.subjectType} ${delivery.subjectId} v${delivery.version} to user-${delivery.userId}: ${covering} recorded`)
        }
    }
}

const dryRunOf = (senderEvent: SenderEvent, onChannel: ToUser[], sending: Set<ToUser>, recorded: Delivery[]): DeliveryDryRun => ({
    senderEvent,
    users: [...groupBy<ToUser, number>(delivery => delivery.userId)(onChannel)].map(([userId, ofUser]) => ({
        userId,
        toSend: countByNotification(ofUser.filter(delivery => sending.has(delivery))),
        recorded: ofUser.filter(delivery => coveringDeliveries(recorded, delivery, EMAIL).length > 0).length
    }))
})

// The deliveries composed and queued in one emit; the queued ones recorded in one write, each its dedupe key as reference
const send = async (d1Client: D1Database, channel: Extract<EmailChannel, {on: true}>, sending: ToUser[], jobRunId?: number): Promise<ToUser[]> => {
    if (sending.length === 0) return []
    const results = await emit(channel.queue, sending.map(delivery => composeEmail(channel.config, {
        kind: delivery.notification, to: delivery.to, userId: delivery.userId, values: delivery.values(channel.config), correlationId: delivery.correlationId
    })))
    const queued = sending.flatMap((delivery, index) => results[index]!.queued ? [{delivery, reference: results[index]!.dedupeKey}] : [])
    const rows: DeliveryCreate[] = queued.map(({delivery: {subjectType, subjectId, version}, reference}) => ({subjectType, subjectId, version, kind: EMAIL, reference, jobRunId}))
    if (rows.length > 0) await recordDeliveries(d1Client, rows)
    return queued.map(({delivery}) => delivery)
}

/**
 * A sender event's desired deliveries on the e-mail channel: sent where no recorded row covers them, or counted in a
 * delivery dry run. The sender event hands them over or the read that derives them; a failure of either is its one
 * failed line
 */
export const deliverDesired = async (
    d1Client: D1Database, channel: EmailChannel, senderEvent: SenderEvent, desired: DesiredOutgoing[] | (() => Promise<DesiredOutgoing[]>),
    {jobRunId, adminOverride, dryRun}: DeliveryOptions = {}
): Promise<DeliveryResult> => {
    try {
        const deliveries = once(typeof desired === 'function' ? await desired() : desired)
        const onChannel = deliveries.filter(isToUser).filter(delivery => wantsChannel(delivery, NotificationChannelSchema.enum.EMAIL))
        const sendable = channel.on ? onChannel : []
        const recorded = sendable.length === 0 ? [] : await readRecorded(d1Client, sendable)
        warnSentTwice(sendable, recorded)
        const sending = sendable.filter(delivery => shouldSend(recorded, delivery, EMAIL, adminOverride !== undefined))
        if (dryRun) return {counts: {sent: 0}, dryRun: dryRunOf(senderEvent, sendable, new Set(sending), recorded)}

        if (!channel.on && onChannel.length > 0) console.warn(`${LOG} [EVENT ${senderEvent}] e-mail is off (${channel.missing} not set): ${onChannel.length} not sent`)
        const sent = channel.on ? await send(d1Client, channel, sending, jobRunId) : []
        if (adminOverride && sent.length > 0) {
            console.info(`${LOG} [EVENT ${senderEvent}] re-sent by admin ${adminOverride.adminUserId} to users ${[...new Set(sent.map(delivery => delivery.userId))].join(', ')}`)
        }
        if (sent.length > 0) console.info(`${LOG} [EVENT ${senderEvent}] sent ${sent.length}`)
        return {counts: {sent: sent.length}}
    } catch (error) {
        console.error(`${LOG} [EVENT ${senderEvent}] failed: ${error instanceof Error ? error.message : String(error)}`)
        throw error
    }
}

/** The user does not wait for notifications: the work runs after the response, and its failure is its own log line */
export const deliverInBackground = (event: H3Event, work: () => Promise<unknown>): void => event.waitUntil(work().catch(() => undefined))
