import {defineEventHandler, getValidatedRouterParams, setResponseStatus} from "h3"
import {fetchSeason, saveDinnerEvent} from "~~/server/data/prismaRepository"
import {useSeason} from "~/composables/useSeason"
import {useSeasonValidation} from "~/composables/useSeasonValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {z} from "zod"

const {h3eFromCatch} = eventHandlerHelper
const {deserializeSeason} = useSeasonValidation()
const {generateDinnerEventDataForSeason} = useSeason()

const idSchema = z.object({
    id: z.coerce.number().int().positive('Season ID must be a positive integer')
})

export default defineEventHandler(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let seasonId: number
    try {
        const params = await getValidatedRouterParams(event, idSchema.parse)
        seasonId = params.id
    } catch (error) {
        const h3e = h3eFromCatch('🗓️ > SEASON > [GENERATE_EVENTS] Input validation error', error)
        console.error(`🗓️ > SEASON > [GENERATE_EVENTS] ${h3e.statusMessage}`, error)
        throw h3e
    }

    // Business logic try-catch - separate concerns
    try {
        console.info(`🗓️ > SEASON > [GENERATE_EVENTS] Generating dinner events for season ${seasonId}`)

        // Fetch season from database
        const serializedSeason = await fetchSeason(d1Client, seasonId)
        if (!serializedSeason) {
            const h3e = h3eFromCatch(`🗓️ > SEASON > [GENERATE_EVENTS] Season ${seasonId} not found`, new Error('Not found'))
            h3e.statusCode = 404
            throw h3e
        }

        // Deserialize season to get proper Date objects
        const season = deserializeSeason(serializedSeason)

        // Generate dinner event data using composable
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
        const h3e = h3eFromCatch(`🗓️ > SEASON > [GENERATE_EVENTS] Error generating dinner events for season ${seasonId}`, error)
        console.error(`🗓️ > SEASON > [GENERATE_EVENTS] ${h3e.statusMessage}`, error)
        throw h3e
    }
})