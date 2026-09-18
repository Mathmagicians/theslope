/**
 * Nitro Scheduled Task: Monthly Billing
 *
 * Triggered by Cloudflare Cron on the 18th at 03:00 UTC (04:00/05:00 Copenhagen).
 * Runs day after billing cutoff (17th) to bill the just-closed period.
 * Uses D1 directly via context.cloudflare.env.DB; archives the CSV (ARCHIVE) and queues the accountant mail (SENDER).
 */
import {runMonthlyBilling} from '~~/server/utils/monthlyBillingService'
import {getNotificationConfig} from '~~/server/utils/sender/config'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const LOG = '🔧 > TASK > [MONTHLY_BILLING]'
const {throwH3Error} = eventHandlerHelper

export default defineTask({
    meta: {
        name: 'monthly-billing',
        description: 'Generate monthly invoices for households'
    },
    async run({ context }) {
        const env = context?.cloudflare?.env
        if (!env?.DB) {
            return throwH3Error(`${LOG} D1 not available - must be triggered via Cloudflare cron`, new Error('D1 not available'))
        }

        try {
            const result = await runMonthlyBilling(env.DB, 'CRON', {queue: env.SENDER, archive: env.ARCHIVE, notifications: getNotificationConfig()})
            return { result }
        } catch (error) {
            return throwH3Error(`${LOG} Failed`, error)
        }
    }
})
