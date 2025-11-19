import {fetchSeason} from "~~/server/data/prismaRepository"
import {updateDinnerEvent} from "~~/server/data/financesRepository"
import {useSeason} from "~/composables/useSeason"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {z} from "zod"
import type {Season} from "~/composables/useSeasonValidation"
import type {DinnerEventDetail} from "~/composables/useBookingValidation"

const {throwH3Error} = eventHandlerHelper
const {assignTeamsToEvents} = useSeason()

const idSchema = z.object({
    id: z.coerce.number().int().positive('Season ID must be a positive integer')
})

type AssignTeamsResponse = {
    seasonId: number
    eventCount: number
    events: DinnerEventDetail[]
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
        throwH3Error('🗓️ > SEASON > [ASSIGN_COOKING_TEAMS] Input validation error', error)
    }

    // Fetch season
    let season: Season
    try {
        const fetchedSeason = await fetchSeason(d1Client, seasonId)
        if (!fetchedSeason) {
            throwH3Error(`🗓️ > SEASON > [ASSIGN_COOKING_TEAMS] Season ${seasonId} not found`, new Error('Not found'), 404)
        }
        season = fetchedSeason
    } catch (error) {
        throwH3Error(`🗓️ > SEASON > [ASSIGN_COOKING_TEAMS] Error fetching season ${seasonId}`, error)
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
        throwH3Error(`🗓️ > SEASON > [ASSIGN_COOKING_TEAMS] Error assigning teams to dinner events for season ${seasonId}`, error)
    }
})
