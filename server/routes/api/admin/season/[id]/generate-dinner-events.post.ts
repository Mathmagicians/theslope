import {defineEventHandler, getValidatedRouterParams, setResponseStatus} from "h3"
import {fetchSeason} from "~~/server/data/prismaRepository"
import {fetchDinnerEvents} from "~~/server/data/financesRepository"
import type {DinnerEventDisplay} from "~/composables/useBookingValidation"
import {reconcileDinnerEventsForSeason, type ReconciliationResult} from "~~/server/utils/reconcileDinnerEvents"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {z} from "zod"

const {throwH3Error} = eventHandlerHelper
const LOG = '🗓️ > SEASON > [GENERATE_EVENTS]'

const idSchema = z.object({
    id: z.coerce.number().int().positive('Season ID must be a positive integer')
})

type GenerateDinnerEventsResponse = {
    seasonId: number
    eventCount: number
    events: DinnerEventDisplay[]
    reconciliation: ReconciliationResult
}

/**
 * POST /api/admin/season/[id]/generate-dinner-events
 *
 * Idempotent endpoint (ADR-015): Safe to call multiple times.
 * Reconciles existing events with generated events:
 * - Creates events for new dates
 * - Keeps existing events (idempotent)
 * - Deletes events for dates no longer in season (e.g., holiday added)
 */
export default defineEventHandler(async (event): Promise<GenerateDinnerEventsResponse> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation - FAIL EARLY
    let seasonId!: number
    try {
        const params = await getValidatedRouterParams(event, idSchema.parse)
        seasonId = params.id
    } catch (error) {
        return throwH3Error(`${LOG} Input validation error`, error)
    }

    // Business logic
    try {
        console.info(`${LOG} Generating dinner events for season ${seasonId}`)

        const season = await fetchSeason(d1Client, seasonId)
        if (!season) {
            return throwH3Error(`${LOG} Season ${seasonId} not found`, new Error('Not found'), 404)
        }

        const reconciliation = await reconcileDinnerEventsForSeason(d1Client, season, LOG)

        const allEvents = await fetchDinnerEvents(d1Client, seasonId)
        console.info(`${LOG} Successfully reconciled dinner events for season ${seasonId}: ${allEvents.length} total events`)

        setResponseStatus(event, 201)
        return {
            seasonId,
            eventCount: allEvents.length,
            events: allEvents,
            reconciliation
        }
    } catch (error) {
        return throwH3Error(`${LOG} Error generating dinner events for season ${seasonId}`, error)
    }
})
