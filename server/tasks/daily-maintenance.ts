/**
 * Nitro Scheduled Task: Daily Maintenance
 *
 * Triggered by Cloudflare Cron at 01:00 UTC (02:00/03:00 Copenhagen).
 * Calls the existing HTTP endpoint which has D1 access.
 *
 * Steps performed by the endpoint:
 * 1. Consume past dinners (SCHEDULED/ANNOUNCED → CONSUMED)
 * 2. Close orders on consumed dinners (BOOKED/RELEASED → CLOSED)
 * 3. Create transactions for closed orders
 * 4. Scaffold pre-bookings for rolling 60-day window
 */
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const LOG = '🔧 > TASK > [DAILY_MAINTENANCE]'
const {throwH3Error} = eventHandlerHelper

export default defineTask({
    meta: {
        name: 'daily-maintenance',
        description: 'Consume dinners, close orders, create transactions, scaffold pre-bookings'
    },
    async run() {
        console.info(`${LOG} Starting via cron trigger`)

        try {
            const result = await $fetch('/api/admin/maintenance/daily', {
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
