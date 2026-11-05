/**
 * Sender event `test`: one real e-mail proving the pipe end to end - to the admin mailbox by default,
 * to the recipient the caller names otherwise (a member testing their own notifications).
 * Called by its HTTP twins (POST /api/admin/sender/event/test, POST /api/user/notifications/test).
 */
import {channelOff, emit, notSent} from '~~/server/utils/sender/emit'
import {composeEmail, missingAddress} from '~~/server/utils/sender/compose'
import type {EmailMessage, NotificationConfig, SenderEmitResult} from '~/composables/useNotificationValidation'
import type {EmailChannel} from '~~/server/utils/sender/config'
import {NotificationKind} from '~/config/notificationTemplates'

const KIND = NotificationKind.TEST
const LOG = `📮 > SENDER > [EVENT ${KIND}]`

export const buildTestEmail = (config: NotificationConfig, to: string = config.adminEmail, now?: Date): EmailMessage =>
    composeEmail(config, {kind: KIND, to, now})

export const emitTestEmail = (channel: EmailChannel, to?: string): Promise<SenderEmitResult> => {
    if (!channel.on) return channelOff(KIND, channel.missing)
    const recipient = to ?? channel.config.adminEmail
    if (!recipient) {
        console.warn(`${LOG} ${missingAddress(channel.config, 'adminEmail')} not set — mail not sent`)
        return notSent(KIND)
    }
    return emit(channel.queue, buildTestEmail(channel.config, recipient)).then(([result]) => result!)
}
