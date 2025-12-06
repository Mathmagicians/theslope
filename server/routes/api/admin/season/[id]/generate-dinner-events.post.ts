import {defineEventHandler, getValidatedRouterParams, setResponseStatus} from "h3"
import {fetchSeason} from "~~/server/data/prismaRepository"
import {saveDinnerEvents} from "~~/server/data/financesRepository"
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

        const {generateDinnerEventDataForSeason} = useSeason()
        const dinnerEventDataArray = generateDinnerEventDataForSeason(season)

        // Bulk insert with createManyAndReturn
        const savedEvents = await saveDinnerEvents(d1Client, dinnerEventDataArray)

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