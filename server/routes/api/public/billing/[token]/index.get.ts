import {defineEventHandler, setResponseStatus, getValidatedRouterParams, createError} from 'h3'
import {z} from 'zod'
import {fetchBillingPeriodSummaryByToken} from '~~/server/data/prismaRepository'
import {maskPassword} from '~/utils/utils'
import type {BillingPeriodSummaryDetail} from '~/composables/useBillingValidation'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const {throwH3Error} = eventHandlerHelper
const LOG = '💰 > BILLING > [PUBLIC]'

const tokenSchema = z.object({token: z.string().uuid()})

/**
 * GET /api/public/billing/[token]
 * Public billing period data for accountant magic link - no authentication required.
 * Token validates access to a specific billing period.
 */
export default defineEventHandler(async (event): Promise<BillingPeriodSummaryDetail> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // ADR-002: Separate validation try-catch
    let token: string
    try {
        const params = await getValidatedRouterParams(event, tokenSchema.parse)
        token = params.token
    } catch (e) {
        throw createError({statusCode: 400, message: 'Invalid token format', cause: e})
    }

    // Business logic
    try {
        console.info(`${LOG} Fetching billing data for token=${maskPassword(token)}`)
        const summary = await fetchBillingPeriodSummaryByToken(d1Client, token)

        if (!summary) {
            throw createError({statusCode: 404, message: 'Billing period not found'})
        }

        setResponseStatus(event, 200)
        return summary
    } catch (error) {
        if ((error as {statusCode?: number}).statusCode === 404) throw error
        return throwH3Error(`${LOG} Error fetching billing data`, error)
    }
})
