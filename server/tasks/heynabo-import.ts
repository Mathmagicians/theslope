/**
 * Nitro Scheduled Task: Heynabo Import
 *
 * Triggered by Cloudflare Cron at 02:00 UTC (03:00/04:00 Copenhagen).
 * Uses D1 directly via context.cloudflare.env.DB.
 */
import {runHeynaboImport} from '~~/server/utils/heynaboImportService'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const LOG = '🔧 > TASK > [HEYNABO_IMPORT]'
const {throwH3Error} = eventHandlerHelper

export default defineTask({
    meta: {
        name: 'heynabo-import',
        description: 'Synchronize households and inhabitants from Heynabo'
    },
    async run({ context }) {
        const d1Client = context?.cloudflare?.env?.DB
        if (!d1Client) {
            return throwH3Error(`${LOG} D1 not available - must be triggered via Cloudflare cron`, new Error('D1 not available'))
        }

        try {
            const result = await runHeynaboImport(d1Client, 'CRON')
            return { result }
        } catch (error) {
            return throwH3Error(`${LOG} Failed`, error)
        }
    }
})
