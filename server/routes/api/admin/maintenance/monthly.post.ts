import {defineEventHandler, setResponseStatus, getQuery} from 'h3'
import {runMonthlyBilling} from '~~/server/utils/monthlyBillingService'
import type {MonthlyBillingResponse} from '~/composables/useBillingValidation'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const {throwH3Error} = eventHandlerHelper

/**
 * POST /api/admin/maintenance/monthly
 *
 * Manual trigger for monthly billing (admin UI).
 * Same logic as cron task, but triggered via HTTP.
 *
 * Query params:
 * - triggeredBy: "ADMIN:<userId>" for manual triggers
 */
export default defineEventHandler(async (event): Promise<MonthlyBillingResponse> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    const query = getQuery(event)
    const triggeredBy = (query.triggeredBy as string) || 'ADMIN'

    try {
        const result = await runMonthlyBilling(d1Client, triggeredBy)
        setResponseStatus(event, 200)
        return result
    } catch (error) {
        return throwH3Error('💰 > MONTHLY > [BILLING] Error during monthly billing', error)
    }
})
