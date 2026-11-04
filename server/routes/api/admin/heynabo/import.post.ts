import {defineEventHandler, setResponseStatus, getValidatedQuery} from 'h3'
import {runHeynaboImport} from '~~/server/utils/heynaboImportService'
import type {HeynaboImportResponse} from '~/composables/useHeynaboValidation'
import {useMaintenanceValidation} from '~/composables/useMaintenanceValidation'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const {throwH3Error} = eventHandlerHelper
const LOG = '🏠 > IMPORT >'

/**
 * POST /api/admin/heynabo/import
 *
 * Manual trigger for Heynabo synchronization (admin UI).
 * Same logic as cron task, but triggered via HTTP.
 *
 * Query params:
 * - triggeredBy: the admin's trigger from the admin UI (`adminTrigger`), the admin when absent
 */
export default defineEventHandler(async (event): Promise<HeynaboImportResponse> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    const {JobTriggerQuerySchema} = useMaintenanceValidation()

    let triggeredBy: string
    try {
        ({triggeredBy} = await getValidatedQuery(event, JobTriggerQuerySchema.parse))
    } catch (error) {
        return throwH3Error(`${LOG} Invalid query parameters`, error, 400)
    }

    try {
        const result = await runHeynaboImport(d1Client, triggeredBy)
        setResponseStatus(event, 200)
        return result
    } catch (error) {
        return throwH3Error(`${LOG} Import operation failed`, error)
    }
})
