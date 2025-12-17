import {defineEventHandler, setResponseHeader, getValidatedRouterParams, createError} from 'h3'
import {z} from 'zod'
import {fetchBillingPeriodSummaryByToken} from '~~/server/data/prismaRepository'
import {useBillingValidation} from '~/composables/useBillingValidation'
import {maskPassword} from '~/utils/utils'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const {throwH3Error} = eventHandlerHelper
const {generateBillingCsv, generateCsvFilename} = useBillingValidation()
const LOG = '💰 > BILLING > [CSV]'

const tokenSchema = z.object({token: z.string().uuid()})

/**
 * GET /api/public/billing/[token]/csv
 * Public CSV export for accountant - no authentication required.
 * Token validates access to a specific billing period.
 */
export default defineEventHandler(async (event): Promise<string> => {
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
        console.info(`${LOG} Public export requested for token=${maskPassword(token)}`)
        const summary = await fetchBillingPeriodSummaryByToken(d1Client, token)

        if (!summary) {
            throw createError({statusCode: 404, message: 'Billing period not found'})
        }

        const csv = generateBillingCsv(summary)
        const filename = generateCsvFilename(summary)

        setResponseHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
        // RFC 5987 encoding for non-ASCII filename (Danish characters)
        const encodedFilename = encodeURIComponent(filename)
        setResponseHeader(event, 'Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`)

        return csv
    } catch (error) {
        if ((error as {statusCode?: number}).statusCode === 404) throw error
        return throwH3Error(`${LOG} Error generating CSV export`, error)
    }
})
