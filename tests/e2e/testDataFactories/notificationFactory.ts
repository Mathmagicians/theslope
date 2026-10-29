import {NOTIFICATION_SIGNATURE, NOTIFICATION_TEMPLATES, NotificationKind, senderAddress, senderDisplayName} from '~/config/notificationTemplates'
import type {NotificationConfig} from '~/composables/useNotificationValidation'
import {useDeliveryValidation, type Delivery, type DesiredDelivery} from '~/composables/useDeliveryValidation'
import type {UserDisplay} from '~/composables/useCoreValidation'
import {templatePlaceholders} from '~/utils/template'
import type {EmailChannel} from '~~/server/utils/sender/config'
import type {DesiredOutgoing} from '~~/server/utils/sender/deliveries'

const {DeliveryKindSchema, DeliverySubjectSchema, deliveryReferencePrefix} = useDeliveryValidation()

// The masked address a recorded delivery's reference carries: every recipient's masks alike
const MASKED_ADDRESS = 'a***@e***.com'
let deliveryId = 0

/** A recorded delivery's reference: the notification, the channel and the user, then the masked address and the message */
const referenceOf = (notification: NotificationKind, kind: Delivery['kind'], userId: number | null): string =>
    `${deliveryReferencePrefix(notification, kind, userId)}${MASKED_ADDRESS}:${crypto.randomUUID()}`

/**
 * Notification config for unit tests: the real templates and signature, dev-like addresses (ADR-003 factory).
 */
export class NotificationFactory {
    /** The mail kinds, one per template of the config: `Kind.WAITLIST_JOINED` */
    static readonly Kind = NotificationKind

    /** The mail kind a dedupe key leads with (`{kind}:{channel}:{maskedRecipient}:{messageId}`), as a result and a Delivery row's reference carry it */
    static readonly mailKindOf = (dedupeKey: string): string => dedupeKey.split(':')[0]!

    static readonly config = (overrides: Partial<NotificationConfig> = {}): NotificationConfig => ({
        environment: 'dev',
        site: 'dev.skraaningen.dk',
        from: senderAddress(overrides.environment ?? 'dev'),
        fromName: senderDisplayName(overrides.environment ?? 'dev'),
        accountantEmail: 'revisor@example.com',
        adminEmail: 'admin@example.com',
        signature: NOTIFICATION_SIGNATURE,
        templates: NOTIFICATION_TEMPLATES,
        ...overrides
    })

    /** E-mail switched on over the given queue */
    static readonly channel = (queue: Queue, overrides: Partial<NotificationConfig> = {}): EmailChannel =>
        ({on: true, queue, config: NotificationFactory.config(overrides)})

    /** E-mail switched off: the deployment lacks its address */
    static readonly channelOff = {on: false, missing: 'DEPLOY_URL'} as const satisfies EmailChannel

    /** A value for every placeholder of the kind's template, each its own name */
    static readonly valuesOf = (kind: NotificationKind): Record<string, string> => {
        const {subject, text} = NOTIFICATION_TEMPLATES[kind]
        return Object.fromEntries([subject, text].flatMap(templatePlaceholders).map(name => [name, name]))
    }

    /** A Delivery row: version 1 of a place on the waiting list, mailed outside a job run */
    static readonly defaultDelivery = (overrides: Partial<Delivery> = {}): Delivery => ({
        id: ++deliveryId,
        subjectType: DeliverySubjectSchema.enum.TICKET_WAITLIST,
        subjectId: 601,
        version: 1,
        kind: DeliveryKindSchema.enum.EMAIL,
        reference: referenceOf(NotificationKind.TEST, DeliveryKindSchema.enum.EMAIL, null),
        jobRunId: null,
        deliveredAt: new Date(),
        ...overrides
    })

    /** The join notification of a user's place on the waiting list, version 1 */
    static readonly defaultDesiredDelivery = (overrides: Partial<DesiredDelivery> = {}): DesiredDelivery => ({
        subjectType: DeliverySubjectSchema.enum.TICKET_WAITLIST,
        subjectId: 601,
        version: 1,
        notification: NotificationKind.WAITLIST_JOINED,
        userId: 6,
        ...overrides
    })

    /**
     * The Delivery row a sent delivery leaves on the channel. Its reference leads with the notification and the channel,
     * then the user for a user's delivery; a mailbox's row carries the masked address, the format the billing rows on
     * prod have
     */
    static readonly recordedDelivery = (
        {subjectType, subjectId, version, notification, userId}: DesiredDelivery,
        kind: Delivery['kind'] = DeliveryKindSchema.enum.EMAIL
    ): Delivery =>
        NotificationFactory.defaultDelivery({subjectType, subjectId, version, kind, reference: referenceOf(notification, kind, userId)})

    /**
     * A desired delivery as a sender event hands it to the delivery step: the user's address and channels and the
     * values of the notification's template
     */
    static readonly defaultDesiredOutgoing = (
        recipient: UserDisplay,
        overrides: Partial<Omit<DesiredDelivery, 'userId'>> = {}
    ): DesiredOutgoing => {
        const desired = NotificationFactory.defaultDesiredDelivery({...overrides, userId: recipient.id})
        return {
            ...desired,
            to: recipient.email,
            notificationChannels: recipient.notificationChannels ?? [],
            values: () => NotificationFactory.valuesOf(desired.notification)
        }
    }

    /**
     * A desired delivery to a mailbox, the accountant's: no user and no channels of its own, the closed notice of a
     * billing period at version 1 unless given
     */
    static readonly mailboxDesiredOutgoing = (
        mailbox: string,
        overrides: Partial<Omit<DesiredDelivery, 'userId'>> = {}
    ): DesiredOutgoing => {
        const desired = NotificationFactory.defaultDesiredDelivery({
            subjectType: DeliverySubjectSchema.enum.BILLING_PERIOD, subjectId: 31, notification: NotificationKind.BILLING_PERIOD_CLOSED,
            ...overrides, userId: null
        })
        return {...desired, to: mailbox, notificationChannels: [], values: () => NotificationFactory.valuesOf(desired.notification)}
    }
}
