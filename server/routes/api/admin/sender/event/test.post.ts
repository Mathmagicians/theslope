import {defineEventHandler, readValidatedBody, getRequestURL, createError, setResponseStatus} from 'h3'
import {useNotificationValidation, type SenderEmitResult} from '~/composables/useNotificationValidation'
import {emitTestEmail} from '~~/server/utils/sender/events/test'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const {SenderEventTestBodySchema, EnvironmentSchema} = useNotificationValidation()
const {throwH3Error} = eventHandlerHelper
const LOG = '📮 > SENDER > [EVENT test]'

/**
 * POST /api/admin/sender/event/test
 *
 * Sends one real test e-mail through the notification pipe: app → SENDER queue → theslope-sender → mailbox.
 * The HTTP twin of the `test` sender event, in the pattern of /api/admin/maintenance/*.
 * Admin only (route table: /api/admin/ POST → isAdmin).
 *
 * Body: {to, replyTo?}. Sender address, display name and environment come from runtimeConfig.notifications
 * (NUXT_NOTIFICATIONS_* vars per environment); the signature names the sending site.
 */
export default defineEventHandler(async (event): Promise<SenderEmitResult> => {
    // Validation — fail early (400)
    let body
    try {
        body = await readValidatedBody(event, SenderEventTestBodySchema.parse)
    } catch (error) {
        console.warn(`${LOG} invalid body`)
        throw createError({statusCode: 400, message: 'Invalid request body', cause: error})
    }

    // Business logic (500)
    try {
        const {notifications} = useRuntimeConfig(event)
        const environment = EnvironmentSchema.parse(notifications.environment)
        const result = await emitTestEmail(event.context.cloudflare.env.SENDER, {
            to: body.to,
            replyTo: body.replyTo ?? (notifications.replyTo || undefined),
            from: notifications.from,
            fromName: notifications.fromName,
            site: getRequestURL(event).host,
            environment
        })
        console.info(`${LOG} ${result.queued ? 'queued' : 'not queued'}`, {dedupeKey: result.dedupeKey, degraded: result.degraded})
        setResponseStatus(event, 200)
        return result
    } catch (error) {
        return throwH3Error(`${LOG} Error emitting test e-mail`, error)
    }
})
