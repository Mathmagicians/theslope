import {defineEventHandler, getValidatedRouterParams, setResponseStatus} from "h3"
import {deleteSeason} from "~~/server/data/prismaRepository"
import {deleteHeynaboEventsAsSystem} from "~~/server/integration/heynabo/heynaboClient"
import type {Season} from "~/composables/useSeasonValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {idParams} from '~/composables/useCoreValidation'
const {throwH3Error} = eventHandlerHelper

// Define schema for ID parameter
const paramSchema = idParams('id')

/**
 * Delete season (admin operation)
 * DELETE /api/admin/season/[id]
 *
 * ADR-013: Heynabo cleanup for announced DinnerEvents (best-effort, batch)
 */
export default defineEventHandler(async (event): Promise<Season> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let id!: number
    try {
        ( {id} = await getValidatedRouterParams(event, paramSchema.parse))
    } catch (error) {
        return throwH3Error('🌞 > DELETE SEASON > Invalid season ID', error)
    }

    // Database operations try-catch - separate concerns
    try {
        console.info(`🌞 > DELETE SEASON > Deleting season with id ${id}`)
        const deletedSeason = await deleteSeason(d1Client, id, deleteHeynaboEventsAsSystem)
        console.info(`🌞 > DELETE SEASON > Successfully deleted season ${deletedSeason.shortName}`)
        setResponseStatus(event, 200)
        return deletedSeason
    } catch (error) {
        return throwH3Error(`🌞 > DELETE SEASON > Error deleting season with id ${id}`, error)
    }
})
