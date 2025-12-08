import {defineEventHandler, getValidatedRouterParams, setResponseStatus} from "h3"
import {z} from 'zod'
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {scaffoldPrebookings, type ScaffoldResult} from "~~/server/utils/scaffoldPrebookings"

const {throwH3Error} = eventHandlerHelper

const LOG = '🎟️ > SEASON > [SCAFFOLD_PREBOOKINGS]'

const idSchema = z.object({
    id: z.coerce.number().int().positive('Season ID must be a positive integer')
})

/**
 * POST /api/admin/season/[id]/scaffold-prebookings
 * Scaffolds pre-bookings for season's dinner events based on inhabitant preferences.
 * Called by: season activation (days 1-60) OR daily cron (day 61+)
 */
export default defineEventHandler(async (event): Promise<ScaffoldResult> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation
    let seasonId: number
    try {
        const params = await getValidatedRouterParams(event, idSchema.parse)
        seasonId = params.id
    } catch (error) {
        return throwH3Error(`${LOG} Validation error`, error)
    }

    // Business logic
    try {
        const result = await scaffoldPrebookings(d1Client, seasonId)
        setResponseStatus(event, 200)
        return result
    } catch (error) {
        return throwH3Error(`${LOG} Error scaffolding pre-bookings`, error)
    }
})
