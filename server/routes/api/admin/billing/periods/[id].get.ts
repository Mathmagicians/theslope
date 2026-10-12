import {defineEventHandler, setResponseStatus, getValidatedRouterParams, createError} from 'h3'
import {idParams} from '~/composables/useCoreValidation'
import {fetchBillingPeriodSummary} from '~~/server/data/prismaRepository'
import type {BillingPeriodSummaryDetail} from '~/composables/useBillingValidation'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const {throwH3Error} = eventHandlerHelper

const paramSchema = idParams('id')

/**
 * GET /api/admin/billing/periods/[id]
 * Fetch billing period summary by ID (ADR-009: Detail type)
 */
export default defineEventHandler(async (event): Promise<BillingPeriodSummaryDetail> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // ADR-002: Separate validation try-catch
    let id: number
    try {
        const params = await getValidatedRouterParams(event, paramSchema.parse)
        id = params.id
    } catch (e) {
        throw createError({statusCode: 400, message: 'Invalid billing period ID', cause: e})
    }

    // Business logic
    try {
        console.info(`💰 > BILLING > [GET] Fetching billing period ID ${id}`)
        const summary = await fetchBillingPeriodSummary(d1Client, id)

        if (!summary) {
            throw createError({statusCode: 404, message: `Billing period ${id} not found`})
        }

        setResponseStatus(event, 200)
        return summary
    } catch (error) {
        if ((error as {statusCode?: number}).statusCode === 404) throw error
        return throwH3Error(`💰 > BILLING > [GET] Error fetching billing period ${id}`, error)
    }
})
