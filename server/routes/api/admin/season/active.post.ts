import {defineEventHandler, readValidatedBody, setResponseStatus} from "h3"
import {activateSeason, fetchInhabitants, updateInhabitantPreferencesBulk} from "~~/server/data/prismaRepository"
import {fetchOrders, createOrders, deleteOrder, fetchUserCancellationKeys} from "~~/server/data/financesRepository"
import {fetchHouseholds, fetchSeason} from "~~/server/data/prismaRepository"
import type {Season} from "~/composables/useSeasonValidation"
import {useSeason} from "~/composables/useSeason"
import {useBookingValidation} from "~/composables/useBookingValidation"
import * as z from 'zod'
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {throwH3Error} = eventHandlerHelper

// Schema for request body
const activateSeasonSchema = z.object({
    seasonId: z.number().int().positive('Season ID must be a positive integer')
})

/**
 * POST /api/admin/season/active
 * Activates a season (ensures only one active season at a time)
 * Also clips inhabitant dinner preferences to match season cooking days.
 * Request body: { seasonId: number }
 * Returns: Activated Season
 */
export default defineEventHandler(async (event): Promise<Season> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch
    let requestData!: {seasonId: number}
    try {
        requestData = await readValidatedBody(event, activateSeasonSchema.parse)
    } catch (error) {
        return throwH3Error('🌞 > SEASON > [POST /active] Validation error', error)
    }

    // Database operations try-catch
    try {
        // 1. Activate the season
        const activatedSeason = await activateSeason(d1Client, requestData.seasonId)
        console.info(`🌞 > SEASON > [POST /active] Successfully activated season ${activatedSeason.shortName}`)

        // 2. Clip inhabitant preferences to match season cooking days
        const {createPreferenceClipper, chunkPreferenceUpdates} = useSeason()
        const clipper = createPreferenceClipper(activatedSeason.cookingDays)

        const inhabitants = await fetchInhabitants(d1Client)
        const updates = clipper(inhabitants)
        console.info(`🌞 > SEASON > [POST /active] Preference updates needed: ${updates.length}/${inhabitants.length} inhabitants`)

        if (updates.length > 0) {
            console.info(`🌞 > SEASON > [POST /active] Clipping preferences for ${updates.length} inhabitants`)
            const batches = chunkPreferenceUpdates(updates)

            for (const batch of batches) {
                await updateInhabitantPreferencesBulk(d1Client, batch)
            }
            console.info(`🌞 > SEASON > [POST /active] Successfully clipped ${updates.length} inhabitant preferences`)
        } else {
            console.info(`🌞 > SEASON > [POST /active] No preference clipping needed`)
        }

        setResponseStatus(event, 200)
        return activatedSeason
    } catch (error) {
        return throwH3Error(`🌞 > SEASON > [POST /active] Error activating season ${requestData.seasonId}`, error)
    }
})
