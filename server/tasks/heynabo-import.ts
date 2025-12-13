/**
 * Nitro Scheduled Task: Heynabo Import
 *
 * Triggered by Cloudflare Cron at 02:00 UTC (03:00/04:00 Copenhagen).
 * Calls the existing HTTP endpoint which has D1 access.
 *
 * Steps performed by the endpoint:
 * 1. Fetch data from Heynabo API
 * 2. Reconcile households and inhabitants
 * 3. Create/delete as needed (Heynabo is source of truth)
 */
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const LOG = '🔧 > TASK > [HEYNABO_IMPORT]'
const {throwH3Error} = eventHandlerHelper

export default defineTask({
    meta: {
        name: 'heynabo-import',
        description: 'Synchronize households and inhabitants from Heynabo'
    },
    async run() {
        console.info(`${LOG} Starting via cron trigger`)

        try {
            const result = await $fetch('/api/admin/heynabo/import', {
                method: 'GET',
                query: { triggeredBy: 'CRON' }
            })

            console.info(`${LOG} Completed`, result)
            return { result }
        } catch (error) {
            return throwH3Error(`${LOG} Failed`, error)
        }
    }
})
