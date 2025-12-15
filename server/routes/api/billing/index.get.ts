import {defineEventHandler, getValidatedQuery, setResponseStatus, createError} from 'h3'
import {fetchHouseholdBilling} from '~~/server/data/financesRepository'
import type {HouseholdBillingResponse} from '~/composables/useBillingValidation'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import {z} from 'zod'

const {throwH3Error} = eventHandlerHelper
const LOG = '💰 > BILLING > [GET]'

const querySchema = z.object({
    householdId: z.coerce.number().int().positive()
})

/**
 * GET /api/billing?householdId=X
 *
 * Fetch billing data for a household:
 * - Current period: unbilled transactions
 * - Past invoices: completed billing periods with transactions
 */
export default defineEventHandler(async (event): Promise<HouseholdBillingResponse> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Validate input
    let householdId: number
    try {
        const query = await getValidatedQuery(event, querySchema.parse)
        householdId = query.householdId
    } catch (error) {
        return throwH3Error(`${LOG} Input validation error`, error)
    }

    // Fetch billing data
    try {
        console.info(`${LOG} Fetching billing for household ${householdId}`)
        const billing = await fetchHouseholdBilling(d1Client, householdId)

        if (!billing) {
            throw createError({statusCode: 404, message: `Household ${householdId} not found`})
        }

        setResponseStatus(event, 200)
        return billing
    } catch (error) {
        return throwH3Error(`${LOG} Error fetching billing`, error)
    }
})
