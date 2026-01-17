import {defineEventHandler, setResponseStatus} from 'h3'
import {fetchUnbilledTransactions} from '~~/server/data/financesRepository'
import {useBilling} from '~/composables/useBilling'
import type {TransactionDisplay} from '~/composables/useBillingValidation'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const {throwH3Error} = eventHandlerHelper
const LOG = '💰 > BILLING > [CURRENT-PERIOD]'

/**
 * GET /api/admin/billing/current-period
 *
 * Fetch all unbilled transactions for the current billing period (admin view).
 * Returns TransactionDisplay[] - UI uses groupByCostEntry() to organize by dinner.
 *
 * This is the "virtual" billing period - what the next invoice run would bill.
 */
export default defineEventHandler(async (event): Promise<TransactionDisplay[]> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    try {
        const {calculateCurrentBillingPeriod} = useBilling()
        const currentPeriod = calculateCurrentBillingPeriod()

        console.info(`${LOG} Fetching unbilled transactions for period ${currentPeriod.start.toISOString().split('T')[0]} - ${currentPeriod.end.toISOString().split('T')[0]}`)

        const transactions = await fetchUnbilledTransactions(d1Client, currentPeriod.end)

        console.info(`${LOG} Found ${transactions.length} unbilled transactions`)
        setResponseStatus(event, 200)
        return transactions
    } catch (error) {
        return throwH3Error(`${LOG} Error fetching current period transactions`, error)
    }
})
