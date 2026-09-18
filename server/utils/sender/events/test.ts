/**
 * Sender event `test`: one real e-mail proving the pipe end to end - to the admin mailbox by default,
 * to the recipient the caller names otherwise (a member testing their own notifications).
 * Called by its HTTP twins (POST /api/admin/sender/event/test, POST /api/user/notifications/test).
 */
import {emit} from '~~/server/utils/sender/emit'
import {composeEmail, missingAddress} from '~~/server/utils/sender/compose'
import type {EmailMessage, NotificationConfig, SenderEmitResult} from '~/composables/useNotificationValidation'

const KIND = 'TEST'
const LOG = `📮 > SENDER > [EVENT ${KIND}]`

export const buildTestEmail = (config: NotificationConfig, to: string = config.adminEmail, now?: Date): EmailMessage =>
    composeEmail(config, {kind: KIND, to, now})

export const emitTestEmail = (
    queue: Queue | undefined,
    config: NotificationConfig,
    to: string = config.adminEmail
): Promise<SenderEmitResult> => {
    if (!to) {
        console.warn(`${LOG} ${missingAddress(config, 'adminEmail')} not set — mail not sent`)
        return Promise.resolve({queued: false, dedupeKey: `${KIND}:EMAIL:unconfigured`, degraded: true})
    }
    return emit(queue, buildTestEmail(config, to))
}
