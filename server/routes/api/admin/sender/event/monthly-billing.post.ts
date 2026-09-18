import {defineEventHandler, readValidatedBody, createError, setResponseStatus} from 'h3'
import {useNotificationValidation, type SenderEmitResult} from '~/composables/useNotificationValidation'
import {notifyBillingPeriod} from '~~/server/utils/monthlyBillingService'
import {getNotificationConfig} from '~~/server/utils/sender/config'
import {fetchBillingPeriodSummary} from '~~/server/data/prismaRepository'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const {SenderEventMonthlyBillingBodySchema} = useNotificationValidation()
const {throwH3Error} = eventHandlerHelper
const LOG = '📮 > SENDER > [EVENT monthly-billing]'

/**
 * POST /api/admin/sender/event/monthly-billing
 *
 * Re-sends the accountant mail (BILLING_PERIOD_CLOSED, CSV attached, cc admin) for one billing period and
 * stamps the period as notified for its current CSV — the HTTP twin of the mail runMonthlyBilling sends.
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

    try {
        const result = await notifyBillingPeriod(env.DB, env.SENDER, getNotificationConfig(event), summary)
        console.info(`${LOG} ${result.queued ? 'queued' : 'not queued'}`, {dedupeKey: result.dedupeKey, degraded: result.degraded})
        setResponseStatus(event, 200)
        return result
    } catch (error) {
        return throwH3Error(`${LOG} Error emitting accountant mail`, error)
    }
})
