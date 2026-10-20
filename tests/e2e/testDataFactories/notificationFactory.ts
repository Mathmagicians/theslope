import {NOTIFICATION_SIGNATURE, NOTIFICATION_TEMPLATES, senderAddress, senderDisplayName} from '~/config/notificationTemplates'
import type {NotificationConfig} from '~/composables/useNotificationValidation'
import type {EmailChannel} from '~~/server/utils/sender/config'
import type {BookingMails} from '~~/server/utils/sender/events/waitlist'

/**
 * Notification config for unit tests: the real templates and signature, dev-like addresses (ADR-003 factory).
 */
export class NotificationFactory {
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

    /** The booking mails of one operation: none of any kind unless given */
    static readonly defaultBookingMails = (overrides: Partial<BookingMails> = {}): BookingMails =>
        ({joined: [], buildups: [], sold: [], assigned: [], extraPortions: [], ...overrides})
}
