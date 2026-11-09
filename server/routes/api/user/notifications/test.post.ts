/**
 * POST /api/user/notifications/test - one test message to the session user's own mailbox.
 *
 * The member's twin of POST /api/admin/sender/event/test: the same `test` sender event with the
 * session user as recipient. Answers 200 with the degraded result when the SENDER binding is
 * missing in this environment, so the UI reports "not set up here" instead of an error.
 *
 * ADR Compliance:
 * - ADR-002: business logic in its own try-catch (no body to validate)
 * - ADR-013: the notification pipe is an integration concern, degraded is not a failure
 */
import {defineEventHandler, setResponseStatus} from 'h3'
import type {SenderEmitResult} from '~/composables/useNotificationValidation'
import {emitTestEmail} from '~~/server/utils/sender/events/test'
import {emailChannel} from '~~/server/utils/sender/config'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import {getRequiredUser} from '~~/server/utils/authorizationHelper'

const {throwH3Error} = eventHandlerHelper
const LOG = '📮 > SENDER > [EVENT test/user]'

export default defineEventHandler(async (event): Promise<SenderEmitResult> => {
    const user = await getRequiredUser(event)

    try {
        const result = await emitTestEmail(emailChannel(event.context.cloudflare.env), user.email)
        console.info(`${LOG} ${result.queued ? 'queued' : 'not queued'} for user id=${user.id}`, {dedupeKey: result.dedupeKey, degraded: result.degraded})
        setResponseStatus(event, 200)
        return result
    } catch (error) {
        return throwH3Error(`${LOG} Error emitting test message for user ${user.id}`, error)
    }
})
