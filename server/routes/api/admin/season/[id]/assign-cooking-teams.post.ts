import {fetchSeason, updateDinnerEvent} from "~~/server/data/prismaRepository"
import {useSeason} from "~/composables/useSeason"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {z} from "zod"
import type {Season} from "~/composables/useSeasonValidation"
import type {DinnerEvent} from "~/composables/useDinnerEventValidation"

const {h3eFromCatch} = eventHandlerHelper
const {assignTeamsToEvents} = useSeason()

const idSchema = z.object({
    id: z.coerce.number().int().positive('Season ID must be a positive integer')
})

type AssignTeamsResponse = {
    seasonId: number
    eventCount: number
    events: DinnerEvent[]
}

export default defineEventHandler(async (event): Promise<AssignTeamsResponse> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation - FAIL EARLY
    let seasonId: number
    try {
        const params = await getValidatedRouterParams(event, idSchema.parse)
        seasonId = params.id
    } catch (error) {
        const h3e = h3eFromCatch('🗓️ > SEASON > [ASSIGN_COOKING_TEAMS] Input validation error', error)
        console.error(`🗓️ > SEASON > [ASSIGN_COOKING_TEAMS] ${h3e.statusMessage}`, error)
        throw h3e
    }

    // Fetch season
    let season: Season
    try {
        const fetchedSeason = await fetchSeason(d1Client, seasonId)
        if (!fetchedSeason) {
            const h3e = h3eFromCatch(`🗓️ > SEASON > [ASSIGN_COOKING_TEAMS] Season ${seasonId} not found`, new Error('Not found'))
            h3e.statusCode = 404
            throw h3e
        }
        season = fetchedSeason
    } catch (error) {
        const h3e = h3eFromCatch(`🗓️ > SEASON > [ASSIGN_COOKING_TEAMS] Error fetching season ${seasonId}`, error)
        console.error(`🗓️ > SEASON > [ASSIGN_COOKING_TEAMS] ${h3e.statusMessage}`, error)
        throw h3e
    }

    // Business logic
    try {
        console.info(`🗓️ > SEASON > [ASSIGN_COOKING_TEAMS] Assigning teams to dinner events for season ${seasonId}`)

        const eventsWithAssignments = assignTeamsToEvents(season)

        const updatedEvents = await Promise.all(
            eventsWithAssignments
                .filter(event => event.id && event.cookingTeamId)
                .map(event => updateDinnerEvent(d1Client, event.id!, {cookingTeamId: event.cookingTeamId}))
        )

        console.info(`🗓️ > SEASON > [ASSIGN_COOKING_TEAMS] Successfully assigned teams to ${updatedEvents.length} dinner events for season ${seasonId}`)

        setResponseStatus(event, 200)
        return {
            seasonId,
            eventCount: updatedEvents.length,
            events: updatedEvents
        }
    } catch (error) {
        const h3e = h3eFromCatch(`🗓️ > SEASON > [ASSIGN_COOKING_TEAMS] Error assigning teams to dinner events for season ${seasonId}`, error)
        console.error(`🗓️ > SEASON > [ASSIGN_COOKING_TEAMS] ${h3e.statusMessage}`, error)
        throw h3e
    }
})
