/**
 * Nitro Scheduled Task: Monthly Billing
 *
 * Triggered by Cloudflare Cron on the 17th at 03:00 UTC (04:00/05:00 Copenhagen).
 * Uses D1 directly via context.cloudflare.env.DB.
 */
import {runMonthlyBilling} from '~~/server/utils/monthlyBillingService'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const LOG = '🔧 > TASK > [MONTHLY_BILLING]'
const {throwH3Error} = eventHandlerHelper

export default defineTask({
    meta: {
        name: 'monthly-billing',
        description: 'Generate monthly invoices for households'
    },
    async run({ context }) {
        const d1Client = context?.cloudflare?.env?.DB
        if (!d1Client) {
            return throwH3Error(`${LOG} D1 not available - must be triggered via Cloudflare cron`, new Error('D1 not available'))
        }

        try {
            const result = await runMonthlyBilling(d1Client, 'CRON')
            return { result }
        } catch (error) {
            return throwH3Error(`${LOG} Failed`, error)
        }
    }
})
