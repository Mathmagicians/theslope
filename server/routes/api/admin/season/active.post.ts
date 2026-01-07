import {defineEventHandler, readValidatedBody, setResponseStatus} from "h3"
import {activateSeason} from "~~/server/data/prismaRepository"
import type {Season} from "~/composables/useSeasonValidation"
import * as z from 'zod'
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {clipPreferences} from "~~/server/utils/initializePreferences"
import {scaffoldPrebookings} from "~~/server/utils/scaffoldPrebookings"

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
        const activatedSeason = await activateSeason(d1Client, requestData.seasonId)
        console.info(`🌞 > SEASON > [POST /active] Activated season ${activatedSeason.shortName}`)

        const clipResult = await clipPreferences(d1Client, activatedSeason.id!)
        console.info(`🌞 > SEASON > [POST /active] Clipped ${clipResult.initialized} inhabitants`)

        const scaffoldResult = await scaffoldPrebookings(d1Client, {seasonId: activatedSeason.id!})
        console.info(`🌞 > SEASON > [POST /active] Scaffolded ${scaffoldResult?.created ?? 0} orders`)

        setResponseStatus(event, 200)
        return activatedSeason
    } catch (error) {
        return throwH3Error(`🌞 > SEASON > [POST /active] Error activating season ${requestData.seasonId}`, error)
    }
})
