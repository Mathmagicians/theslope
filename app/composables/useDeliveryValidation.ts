/**
 * Delivery validation — the delivery facts a run leaves behind (ADR-001 validation layer).
 * A delivery is one version of a subject reaching one channel: the CSV archived to R2, a mail queued.
 * A desired delivery is one notification a sender event sends one user, or a configured mailbox, about one subject at
 * one version; the recorded rows tell which of them went.
 * Isomorphic (ADR-017): explicit imports only.
 */
import {z} from 'zod'
import {DeliveryKindSchema, DeliverySubjectSchema} from '~~/prisma/generated/zod'
import {NotificationKind} from '~/config/notificationTemplates'

const DeliverySchema = z.object({
    id: z.number().int(),
    subjectType: DeliverySubjectSchema,
    subjectId: z.number().int(),
    version: z.number().int().min(1),
    kind: DeliveryKindSchema,
    reference: z.string().min(1),
    jobRunId: z.number().int().nullable(),
    deliveredAt: z.coerce.date()
})

const DeliveryCreateSchema = DeliverySchema.omit({id: true, deliveredAt: true, jobRunId: true}).extend({
    jobRunId: z.number().int().optional()
})

/** The sender events the notifications come in: each reads its own data and sends its own notifications */
const SenderEventSchema = z.enum(['BOOKING_STATUS', 'MONTHLY_BILLING', 'CHEF_DEADLINES'])

/** The notifications, one per template of the config */
const NotificationKindSchema = z.enum(NotificationKind)

/** One notification to one recipient about one subject at one version; userId null for a delivery to a configured mailbox */
const DesiredDeliverySchema = z.object({
    subjectType: DeliverySubjectSchema,
    subjectId: z.number().int(),
    version: z.number().int().min(1),
    notification: NotificationKindSchema,
    userId: z.number().int().nullable()
})

/** What a sender event's run did on a channel: the deliveries it sent */
const DeliveryCountsSchema = z.object({
    sent: z.number().int().nonnegative()
})

const NotificationCountsSchema = z.partialRecord(NotificationKindSchema, z.number().int().positive())

/** The delivery dry run of a sender event: per user how many of each notification its next run sends */
const DeliveryDryRunSchema = z.object({
    senderEvent: SenderEventSchema,
    users: z.array(z.object({
        userId: z.number().int(),
        toSend: NotificationCountsSchema
    }))
})

/** What the delivery read answers: the recorded rows of the subjects named, or a sender event's delivery dry run */
const DeliveryReadSchema = z.enum(['RECORDED', 'DRY_RUN'])

// The delivery read's query: one subject type and its subjects' ids, one id or the parameter repeated; or the sender
// event of the dry run, the booking status alone
const DeliveryQuerySchema = z.union([
    z.object({
        subjectType: DeliverySubjectSchema,
        subjectIds: z.preprocess(ids => [ids].flat(), z.array(z.coerce.number().int().positive()).min(1))
    }).transform(({subjectType, subjectIds}) => ({read: DeliveryReadSchema.enum.RECORDED, subjectType, subjectIds})),
    z.object({dryRun: z.literal(SenderEventSchema.enum.BOOKING_STATUS)})
        .transform(({dryRun}) => ({read: DeliveryReadSchema.enum.DRY_RUN, senderEvent: dryRun}))
])

/** The highest delivered version per kind for one subject; 0 before the first delivery of that kind (one key per DeliveryKind) */
const DeliveredVersionsSchema = z.object({
    ARCHIVE: z.number().int().min(0),
    EMAIL: z.number().int().min(0),
    SMS: z.number().int().min(0)
})

const NO_DELIVERIES: DeliveredVersions = {ARCHIVE: 0, EMAIL: 0, SMS: 0}

/** Pure: reduce a subject's delivery rows to the highest version per kind */
export const deliveredVersions = (rows: Array<Pick<Delivery, 'kind' | 'version'>>): DeliveredVersions =>
    rows.reduce((max, row) => ({...max, [row.kind]: Math.max(max[row.kind], row.version)}), {...NO_DELIVERIES})

const USER_MARK = 'user-'

/**
 * A recorded row's reference leads with the notification, the channel and the user, so two users whose addresses mask
 * alike stay two; a mailbox's reference goes on with the masked address
 */
const deliveryReferencePrefix = (notification: NotificationKind, channel: Delivery['kind'], userId: number | null): string =>
    `${notification}:${channel}:${userId === null ? '' : `${USER_MARK}${userId}/`}`

/** The recorded rows of the desired delivery's subject, version, notification, channel and user; a mailbox's rows for a mailbox */
const coveringDeliveries = (recorded: Delivery[], desired: DesiredDelivery, channel: Delivery['kind']): Delivery[] => {
    const prefix = deliveryReferencePrefix(desired.notification, channel, desired.userId)
    const ofRecipient = (reference: string): boolean =>
        reference.startsWith(prefix) && (desired.userId !== null || !reference.startsWith(`${prefix}${USER_MARK}`))
    return recorded.filter(row => row.subjectType === desired.subjectType && row.subjectId === desired.subjectId
        && row.version === desired.version && row.kind === channel && ofRecipient(row.reference))
}

/** Whether a recorded row delivered the notification, on its channel and to whomever it went */
const isDeliveryOf = (notification: NotificationKind) => (row: Delivery): boolean =>
    row.reference.startsWith(deliveryReferencePrefix(notification, row.kind, null))

/** A delivery is sent when no recorded row covers it; an admin's override sends it again */
const shouldSend = (covering: number, adminOverride: boolean): boolean => adminOverride || covering === 0

export type Delivery = z.infer<typeof DeliverySchema>
export type DeliveryCreate = z.infer<typeof DeliveryCreateSchema>
export type DeliveredVersions = z.infer<typeof DeliveredVersionsSchema>
export type SenderEvent = z.infer<typeof SenderEventSchema>
export type DesiredDelivery = z.infer<typeof DesiredDeliverySchema>
export type DeliveryCounts = z.infer<typeof DeliveryCountsSchema>
export type DeliveryDryRun = z.infer<typeof DeliveryDryRunSchema>

export const useDeliveryValidation = () => ({
    DeliverySchema,
    DeliveryCreateSchema,
    DeliveryReadSchema,
    DeliveryQuerySchema,
    DeliveredVersionsSchema,
    DeliveryKindSchema,
    DeliverySubjectSchema,
    SenderEventSchema,
    NotificationKindSchema,
    DesiredDeliverySchema,
    DeliveryCountsSchema,
    DeliveryDryRunSchema,
    deliveryReferencePrefix,
    isDeliveryOf,
    coveringDeliveries,
    shouldSend
})
