import {defineEventHandler, readValidatedBody, createError, setResponseStatus} from 'h3'
import {useNotificationValidation, type SenderEmitResult} from '~/composables/useNotificationValidation'
import {useDeliveryValidation} from '~/composables/useDeliveryValidation'
import {notifyBillingPeriod} from '~~/server/utils/monthlyBillingService'
import {emailChannel} from '~~/server/utils/sender/config'
import {fetchBillingPeriodSummary} from '~~/server/data/prismaRepository'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import {getRequiredUser} from '~~/server/utils/authorizationHelper'

const {SenderEventMonthlyBillingBodySchema} = useNotificationValidation()
const {SenderEventSchema} = useDeliveryValidation()
const {throwH3Error} = eventHandlerHelper
const LOG = `📮 > SENDER > [EVENT ${SenderEventSchema.enum.MONTHLY_BILLING}]`

/**
 * POST /api/admin/sender/event/monthly-billing
 *
 * The admin's re-send of the accountant notification (CSV attached, cc admin) of one billing period's current
 * version: the admin's override (ADR-004), so it goes whatever the delivery records say, records a delivery row and
 * logs the admin. The HTTP twin of the notification runMonthlyBilling sends.
 * Admin only (route table: /api/admin/ POST → isAdmin).
 *
 * Body: {billingPeriodSummaryId}. 404 when the period does not exist.
 */
export default defineEventHandler(async (event): Promise<SenderEmitResult> => {
    // Validation — fail early (400)
    let body
    try {
        body = await readValidatedBody(event, SenderEventMonthlyBillingBodySchema.parse)
    } catch (error) {
        console.warn(`${LOG} invalid body`)
        throw createError({statusCode: 400, message: 'Invalid request body', cause: error})
    }

    // Business logic (404 / 500)
    const {env} = event.context.cloudflare
    let summary
    try {
        summary = await fetchBillingPeriodSummary(env.DB, body.billingPeriodSummaryId)
    } catch (error) {
        return throwH3Error(`${LOG} Error fetching billing period ${body.billingPeriodSummaryId}`, error)
    }
    if (!summary) {
        console.warn(`${LOG} billing period ${body.billingPeriodSummaryId} not found`)
        throw createError({statusCode: 404, message: 'Billing period not found'})
    }

    const admin = await getRequiredUser(event)

    try {
        const result = await notifyBillingPeriod(env.DB, emailChannel(env), summary, {adminOverride: {adminUserId: admin.id}})
        console.info(`${LOG} ${result.queued ? 'queued' : 'not queued'}`, {dedupeKey: result.dedupeKey, degraded: result.degraded})
        setResponseStatus(event, 200)
        return result
    } catch (error) {
        return throwH3Error(`${LOG} Error emitting accountant mail`, error)
    }
})
