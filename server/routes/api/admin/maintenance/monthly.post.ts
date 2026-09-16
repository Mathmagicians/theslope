import {defineEventHandler, setResponseStatus, getQuery} from 'h3'
import {runMonthlyBilling} from '~~/server/utils/monthlyBillingService'
import {getNotificationConfig} from '~~/server/utils/sender/config'
import type {MonthlyBillingResponse} from '~/composables/useBillingValidation'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const {throwH3Error} = eventHandlerHelper

/**
 * POST /api/admin/maintenance/monthly
 *
 * Manual trigger for monthly billing (admin UI).
 * Same logic as cron task, but triggered via HTTP: generation, CSV archive (ARCHIVE), accountant mail (SENDER).
 *
 * Query params:
 * - triggeredBy: "ADMIN:<userId>" for manual triggers
 */
export default defineEventHandler(async (event): Promise<MonthlyBillingResponse> => {
    const {env} = event.context.cloudflare

    const query = getQuery(event)
    const triggeredBy = (query.triggeredBy as string) || 'ADMIN'

    try {
        const result = await runMonthlyBilling(env.DB, triggeredBy, {queue: env.SENDER, archive: env.ARCHIVE, notifications: getNotificationConfig(event)})
        setResponseStatus(event, 200)
        return result
    } catch (error) {
        return throwH3Error('💰 > MONTHLY > [BILLING] Error during monthly billing', error)
    }
})
