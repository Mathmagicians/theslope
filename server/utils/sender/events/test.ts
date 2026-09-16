/**
 * Sender event `test`: one real e-mail to the admin mailbox, proving the pipe end to end.
 * Called by its HTTP twin (POST /api/admin/sender/event/test).
 */
import {emit} from '~~/server/utils/sender/emit'
import {composeEmail, missingAddress} from '~~/server/utils/sender/compose'
import type {EmailMessage, NotificationConfig, SenderEmitResult} from '~/composables/useNotificationValidation'

const KIND = 'TEST'
const LOG = `📮 > SENDER > [EVENT ${KIND}]`

export const buildTestEmail = (config: NotificationConfig, now?: Date): EmailMessage =>
    composeEmail(config, {kind: KIND, to: config.adminEmail, now})

export const emitTestEmail = (queue: Queue | undefined, config: NotificationConfig): Promise<SenderEmitResult> => {
    const missing = missingAddress(config, 'adminEmail')
    if (missing) {
        console.warn(`${LOG} ${missing} not set — mail not sent`)
        return Promise.resolve({queued: false, dedupeKey: `${KIND}:EMAIL:unconfigured`, degraded: true})
    }
    return emit(queue, buildTestEmail(config))
}
