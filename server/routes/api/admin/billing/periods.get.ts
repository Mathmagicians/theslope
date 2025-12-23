import {defineEventHandler, setResponseStatus} from 'h3'
import {fetchBillingPeriodSummaries} from '~~/server/data/prismaRepository'
import type {BillingPeriodSummaryDisplay} from '~/composables/useBillingValidation'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const {throwH3Error} = eventHandlerHelper

/**
 * GET /api/admin/billing/periods
 * Fetch all billing period summaries (ADR-009: Display type for index)
 */
export default defineEventHandler(async (event): Promise<BillingPeriodSummaryDisplay[]> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    try {
        console.info('💰 > BILLING > [GET] Fetching all billing periods')
        const summaries = await fetchBillingPeriodSummaries(d1Client)
        setResponseStatus(event, 200)
        return summaries
    } catch (error) {
        return throwH3Error('💰 > BILLING > [GET] Error fetching billing periods', error)
    }
})
