import {defineEventHandler, setResponseStatus, getValidatedQuery} from "h3"
import {runDailyMaintenance} from "~~/server/utils/dailyMaintenanceService"
import {emailChannel} from "~~/server/utils/sender/config"
import {useBookingValidation, type DailyMaintenanceResult} from "~/composables/useBookingValidation"
import {useMaintenanceValidation} from "~/composables/useMaintenanceValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {throwH3Error} = eventHandlerHelper
const LOG = '🔧 > DAILY > [MAINTENANCE]'

/**
 * POST /api/admin/maintenance/daily
 *
 * Manual trigger for daily maintenance (admin UI).
 * Same logic as cron task, but triggered via HTTP.
 *
 * Query params:
 * - triggeredBy: the admin's trigger from the admin UI (`adminTrigger`), the admin when absent
 */
export default defineEventHandler(async (event): Promise<DailyMaintenanceResult> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    const {DailyMaintenanceResultSchema} = useBookingValidation()
    const {JobTriggerQuerySchema} = useMaintenanceValidation()

    let triggeredBy: string
    try {
        ({triggeredBy} = await getValidatedQuery(event, JobTriggerQuerySchema.parse))
    } catch (error) {
        return throwH3Error(`${LOG} Invalid query parameters`, error, 400)
    }

    try {
        const result = await runDailyMaintenance(d1Client, triggeredBy, emailChannel(cloudflare.env))
        setResponseStatus(event, 200)
        return DailyMaintenanceResultSchema.parse(result)
    } catch (error) {
        return throwH3Error(`${LOG} Error during daily maintenance`, error)
    }
})
