/**
 * Nitro Scheduled Task: Daily Maintenance
 *
 * Triggered by Cloudflare Cron at 02:00 UTC (03:00/04:00 Copenhagen).
 * Uses D1 directly via context.cloudflare.env.DB.
 */
import {runDailyMaintenance} from '~~/server/utils/dailyMaintenanceService'
import {emailChannel} from '~~/server/utils/sender/config'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const LOG = '🔧 > TASK > [DAILY_MAINTENANCE]'
const {throwH3Error} = eventHandlerHelper

export default defineTask({
    meta: {
        name: 'daily-maintenance',
        description: 'Consume dinners, close orders, create transactions, scaffold pre-bookings, send the booking mails'
    },
    async run({ context }) {
        const env = context?.cloudflare?.env
        const d1Client = env?.DB
        if (!d1Client) {
            return throwH3Error(`${LOG} D1 not available - must be triggered via Cloudflare cron`, new Error('D1 not available'))
        }

        try {
            const result = await runDailyMaintenance(d1Client, 'CRON', emailChannel(env ?? {}))
            return { result }
        } catch (error) {
            return throwH3Error(`${LOG} Failed`, error)
        }
    }
})
