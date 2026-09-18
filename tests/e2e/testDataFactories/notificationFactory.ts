import {NOTIFICATION_SIGNATURE, NOTIFICATION_TEMPLATES, senderAddress, senderDisplayName} from '~/config/notificationTemplates'
import type {NotificationConfig} from '~/composables/useNotificationValidation'

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
}
