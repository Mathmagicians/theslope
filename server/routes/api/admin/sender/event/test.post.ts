import {defineEventHandler, setResponseStatus} from 'h3'
import type {SenderEmitResult} from '~/composables/useNotificationValidation'
import {emitTestEmail} from '~~/server/utils/sender/events/test'
import {getNotificationConfig} from '~~/server/utils/sender/config'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const {throwH3Error} = eventHandlerHelper
const LOG = '📮 > SENDER > [EVENT test]'

/**
 * POST /api/admin/sender/event/test
 *
 * Sends one real test e-mail to the admin mailbox through the notification pipe:
 * app → SENDER queue → theslope-sender → mailbox. The HTTP twin of the `test` sender event,
 * in the pattern of /api/admin/maintenance/*. Admin only (route table: /api/admin/ POST → isAdmin).
 *
 * No body. Environment, site, sender address and display name derive from DEPLOY_URL / the request; the admin
 * mailbox from NUXT_NOTIFICATIONS_ADMIN_EMAIL; the TEST template lives in app.config. Degraded without the mailbox.
 */
export default defineEventHandler(async (event): Promise<SenderEmitResult> => {
    try {
        const result = await emitTestEmail(event.context.cloudflare.env.SENDER, getNotificationConfig(event))
        console.info(`${LOG} ${result.queued ? 'queued' : 'not queued'}`, {dedupeKey: result.dedupeKey, degraded: result.degraded})
        setResponseStatus(event, 200)
        return result
    } catch (error) {
        return throwH3Error(`${LOG} Error emitting test e-mail`, error)
    }
})
