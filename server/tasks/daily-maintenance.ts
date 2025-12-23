/**
 * Nitro Scheduled Task: Daily Maintenance
 *
 * Triggered by Cloudflare Cron at 01:00 UTC (02:00/03:00 Copenhagen).
 * Uses D1 directly via context.cloudflare.env.DB.
 */
import {runDailyMaintenance} from '~~/server/utils/dailyMaintenanceService'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const LOG = '🔧 > TASK > [DAILY_MAINTENANCE]'
const {throwH3Error} = eventHandlerHelper

export default defineTask({
    meta: {
        name: 'daily-maintenance',
        description: 'Consume dinners, close orders, create transactions, scaffold pre-bookings'
    },
    async run({ context }) {
        const d1Client = context?.cloudflare?.env?.DB
        if (!d1Client) {
            return throwH3Error(`${LOG} D1 not available - must be triggered via Cloudflare cron`, new Error('D1 not available'))
        }

        try {
            const result = await runDailyMaintenance(d1Client, 'CRON')
            return { result }
        } catch (error) {
            return throwH3Error(`${LOG} Failed`, error)
        }
    }
})
