import {defineEventHandler, getValidatedRouterParams, setResponseStatus} from "h3"
import {fetchSeason} from "~~/server/data/prismaRepository"
import {saveDinnerEvent} from "~~/server/data/financesRepository"
import {useSeason} from "~/composables/useSeason"
import type {DinnerEventDisplay} from "~/composables/useBookingValidation"
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
}

export default defineEventHandler(async (event): Promise<GenerateDinnerEventsResponse> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let seasonId!: number
    try {
        const params = await getValidatedRouterParams(event, idSchema.parse)
        seasonId = params.id
    } catch (error) {
        return throwH3Error('🗓️ > SEASON > [GENERATE_EVENTS] Input validation error', error)
    }

    // Business logic try-catch - separate concerns
    try {
        console.info(`🗓️ > SEASON > [GENERATE_EVENTS] Generating dinner events for season ${seasonId}`)

        // Fetch season from database (repository returns domain object with Date objects)
        const season = await fetchSeason(d1Client, seasonId)
        if (!season) {
            return throwH3Error(`🗓️ > SEASON > [GENERATE_EVENTS] Season ${seasonId} not found`, new Error('Not found'), 404)
        }

        // Generate dinner event data using composable (call at request time, not module load time)
        const {generateDinnerEventDataForSeason} = useSeason()
        const dinnerEventDataArray = generateDinnerEventDataForSeason(season)

        // Persist all dinner events
        const savedEvents = await Promise.all(
            dinnerEventDataArray.map(eventData => saveDinnerEvent(d1Client, eventData))
        )

        console.info(`🗓️ > SEASON > [GENERATE_EVENTS] Successfully generated ${savedEvents.length} dinner events for season ${seasonId}`)

        setResponseStatus(event, 201)
        return {
            seasonId,
            eventCount: savedEvents.length,
            events: savedEvents
        }
    } catch (error) {
        return throwH3Error(`🗓️ > SEASON > [GENERATE_EVENTS] Error generating dinner events for season ${seasonId}`, error)
    }
})