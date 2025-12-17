import {defineEventHandler, setResponseStatus, getQuery} from "h3"
import {runDailyMaintenance} from "~~/server/utils/dailyMaintenanceService"
import {useBookingValidation, type DailyMaintenanceResult} from "~/composables/useBookingValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {throwH3Error} = eventHandlerHelper

/**
 * POST /api/admin/maintenance/daily
 *
 * Manual trigger for daily maintenance (admin UI).
 * Same logic as cron task, but triggered via HTTP.
 *
 * Query params:
 * - triggeredBy: "ADMIN:<userId>" for manual triggers
 */
export default defineEventHandler(async (event): Promise<DailyMaintenanceResult> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    const {DailyMaintenanceResultSchema} = useBookingValidation()

    const query = getQuery(event)
    const triggeredBy = (query.triggeredBy as string) || 'ADMIN'

    try {
        const result = await runDailyMaintenance(d1Client, triggeredBy)
        setResponseStatus(event, 200)
        return DailyMaintenanceResultSchema.parse(result)
    } catch (error) {
        return throwH3Error('🔧 > DAILY > [MAINTENANCE] Error during daily maintenance', error)
    }
})
