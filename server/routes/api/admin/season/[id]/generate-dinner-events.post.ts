import {defineEventHandler, getValidatedRouterParams, setResponseStatus} from "h3"
import {fetchSeason} from "~~/server/data/prismaRepository"
import {saveDinnerEvents, fetchDinnerEvents, deleteDinnerEvent} from "~~/server/data/financesRepository"
import {useSeason} from "~/composables/useSeason"
import type {DinnerEventDisplay, DinnerEventCreate} from "~/composables/useBookingValidation"
import {pruneAndCreate} from "~/utils/batchUtils"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {z} from "zod"

const {throwH3Error} = eventHandlerHelper

const idSchema = z.object({
    id: z.coerce.number().int().positive('Season ID must be a positive integer')
})

type GenerateDinnerEventsResponse = {
    seasonId: number
    eventCount: number
    events: DinnerEventDisplay[]
    reconciliation: {
        created: number
        idempotent: number
        deleted: number
    }
}

/**
 * Get date key for dinner event comparison (YYYY-MM-DD format)
 * Works for both DinnerEventDisplay (existing) and DinnerEventCreate (incoming)
 */
const getDinnerEventDateKey = (event: DinnerEventDisplay | DinnerEventCreate): string => {
    const date = event.date instanceof Date ? event.date : new Date(event.date)
    return date.toISOString().split('T')[0]!
}

/**
 * Compare dinner events for equality (by date - the only meaningful field for generation)
 */
const dinnerEventsEqual = (_existing: DinnerEventDisplay, _incoming: DinnerEventCreate): boolean => {
    // Events are considered equal if they have the same date (key)
    // Generated events always have same default values, so date match = idempotent
    return true
}

/**
 * Reconcile dinner events using pruneAndCreate pattern (ADR-015)
 */
const reconcileDinnerEvents = pruneAndCreate<DinnerEventDisplay, DinnerEventCreate, string>(
    getDinnerEventDateKey,
    dinnerEventsEqual
)

/**
 * POST /api/admin/season/[id]/generate-dinner-events
 *
 * Idempotent endpoint (ADR-015): Safe to call multiple times.
 * Uses pruneAndCreate to reconcile existing events with generated events:
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
        return throwH3Error('🗓️ > SEASON > [GENERATE_EVENTS] Input validation error', error)
    }

    // Business logic
    try {
        console.info(`🗓️ > SEASON > [GENERATE_EVENTS] Generating dinner events for season ${seasonId}`)

        const season = await fetchSeason(d1Client, seasonId)
        if (!season) {
            return throwH3Error(`🗓️ > SEASON > [GENERATE_EVENTS] Season ${seasonId} not found`, new Error('Not found'), 404)
        }

        // Fetch existing dinner events for this season
        const existingEvents = await fetchDinnerEvents(d1Client, seasonId)

        // Generate desired dinner events from season data
        const {generateDinnerEventDataForSeason} = useSeason()
        const desiredEvents = generateDinnerEventDataForSeason(season)

        // Reconcile using pruneAndCreate (ADR-015: idempotent)
        const reconciliation = reconcileDinnerEvents(existingEvents)(desiredEvents)

        console.info(`🗓️ > SEASON > [GENERATE_EVENTS] Reconciliation: create=${reconciliation.create.length}, idempotent=${reconciliation.idempotent.length}, delete=${reconciliation.delete.length}`)

        // Create new events
        let createdEvents: DinnerEventDisplay[] = []
        if (reconciliation.create.length > 0) {
            createdEvents = await saveDinnerEvents(d1Client, reconciliation.create)
            console.info(`🗓️ > SEASON > [GENERATE_EVENTS] Created ${createdEvents.length} new dinner events`)
        }

        // Delete removed events (e.g., dates that became holidays)
        if (reconciliation.delete.length > 0) {
            const idsToDelete = reconciliation.delete.map(e => e.id)
            await deleteDinnerEvent(d1Client, idsToDelete)
            console.info(`🗓️ > SEASON > [GENERATE_EVENTS] Deleted ${reconciliation.delete.length} dinner events`)
        }

        // Fetch all events to return (existing idempotent + newly created)
        const allEvents = await fetchDinnerEvents(d1Client, seasonId)

        console.info(`🗓️ > SEASON > [GENERATE_EVENTS] Successfully reconciled dinner events for season ${seasonId}: ${allEvents.length} total events`)

        setResponseStatus(event, 201)
        return {
            seasonId,
            eventCount: allEvents.length,
            events: allEvents,
            reconciliation: {
                created: reconciliation.create.length,
                idempotent: reconciliation.idempotent.length,
                deleted: reconciliation.delete.length
            }
        }
    } catch (error) {
        return throwH3Error(`🗓️ > SEASON > [GENERATE_EVENTS] Error generating dinner events for season ${seasonId}`, error)
    }
})