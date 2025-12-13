/**
 * Nitro Scheduled Task: Monthly Billing
 *
 * Triggered by Cloudflare Cron on the 17th at 03:00 UTC (04:00/05:00 Copenhagen).
 * Calls the billing endpoint which has D1 access.
 *
 * Steps performed by the endpoint:
 * 1. Aggregate transactions from previous billing period
 * 2. Generate invoices per household
 * 3. Mark transactions as invoiced
 */
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const LOG = '🔧 > TASK > [MONTHLY_BILLING]'
const {throwH3Error} = eventHandlerHelper

export default defineTask({
    meta: {
        name: 'monthly-billing',
        description: 'Generate monthly invoices for households'
    },
    async run() {
        console.info(`${LOG} Starting via cron trigger`)

        try {
            const result = await $fetch('/api/admin/billing/generate', {
                method: 'POST',
                query: { triggeredBy: 'CRON' }
            })

            console.info(`${LOG} Completed`, result)
            return { result }
        } catch (error) {
            return throwH3Error(`${LOG} Failed`, error)
        }
    }
})
