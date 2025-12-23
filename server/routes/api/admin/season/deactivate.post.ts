import {defineEventHandler, setResponseStatus} from "h3"
import {deactivateSeason} from "~~/server/data/prismaRepository"
import type {Season} from "~/composables/useSeasonValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {throwH3Error} = eventHandlerHelper

/**
 * POST /api/admin/season/deactivate
 * Deactivates the current active season (idempotent)
 * Returns: Deactivated Season or null if none was active
 */
export default defineEventHandler(async (event): Promise<Season | null> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    try {
        const deactivatedSeason = await deactivateSeason(d1Client)
        if (deactivatedSeason) {
            console.info(`🌞 > SEASON > [POST /deactivate] Deactivated season ${deactivatedSeason.shortName}`)
        } else {
            console.info(`🌞 > SEASON > [POST /deactivate] No active season to deactivate`)
        }

        setResponseStatus(event, 200)
        return deactivatedSeason
    } catch (error) {
        return throwH3Error(`🌞 > SEASON > [POST /deactivate] Error deactivating season`, error)
    }
})
