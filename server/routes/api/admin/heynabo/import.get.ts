import {defineEventHandler, setResponseStatus, getQuery} from 'h3'
import {runHeynaboImport} from '~~/server/utils/heynaboImportService'
import type {HeynaboImportResponse} from '~/composables/useHeynaboValidation'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const {throwH3Error} = eventHandlerHelper

/**
 * GET /api/admin/heynabo/import
 *
 * Manual trigger for Heynabo synchronization (admin UI).
 * Same logic as cron task, but triggered via HTTP.
 *
 * Query params:
 * - triggeredBy: "ADMIN:<userId>" for manual triggers
 */
export default defineEventHandler(async (event): Promise<HeynaboImportResponse> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    const query = getQuery(event)
    const triggeredBy = (query.triggeredBy as string) || 'ADMIN'

    try {
        const result = await runHeynaboImport(d1Client, triggeredBy)
        setResponseStatus(event, 200)
        return result
    } catch (error) {
        return throwH3Error('🏠 > IMPORT > Import operation failed', error)
    }
})
