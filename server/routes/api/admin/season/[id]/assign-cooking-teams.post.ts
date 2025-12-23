import {defineEventHandler, getValidatedRouterParams, setResponseStatus} from "h3"
import {fetchSeason} from "~~/server/data/prismaRepository"
import {assignCookingTeamToDinnerEvent} from "~~/server/data/financesRepository"
import {useSeason} from "~/composables/useSeason"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {z} from "zod"
import type {Season} from "~/composables/useSeasonValidation"
import type {DinnerEventDisplay} from "~/composables/useBookingValidation"

const {throwH3Error} = eventHandlerHelper

const idSchema = z.object({
    id: z.coerce.number().int().positive('Season ID must be a positive integer')
})

type AssignTeamsResponse = {
    seasonId: number
    eventCount: number
    events: DinnerEventDisplay[]
}

export default defineEventHandler(async (event): Promise<AssignTeamsResponse> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation - FAIL EARLY
    let seasonId!: number
    try {
        const params = await getValidatedRouterParams(event, idSchema.parse)
        seasonId = params.id
    } catch (error) {
        return throwH3Error('🗓️ > SEASON > [ASSIGN_COOKING_TEAMS] Input validation error', error)
    }

    // Fetch season
    let season!: Season
    try {
        const fetchedSeason = await fetchSeason(d1Client, seasonId)
        if (!fetchedSeason) {
            return throwH3Error(`🗓️ > SEASON > [ASSIGN_COOKING_TEAMS] Season ${seasonId} not found`, new Error('Not found'), 404)
        }
        season = fetchedSeason
    } catch (error) {
        return throwH3Error(`🗓️ > SEASON > [ASSIGN_COOKING_TEAMS] Error fetching season ${seasonId}`, error)
    }

    // Business logic
    try {
        console.info(`🗓️ > SEASON > [ASSIGN_COOKING_TEAMS] Assigning teams to dinner events for season ${seasonId}`)

        // Compute team assignments using composable (call at request time, not module load time)
        const {assignTeamsToEvents, chunkTeamAssignments} = useSeason()
        const eventsWithAssignments = assignTeamsToEvents(season)
            .filter(event => event.id && event.cookingTeamId)

        // Process in batches to avoid D1 rate limits
        const batches = chunkTeamAssignments(eventsWithAssignments)
        const updatedEvents: DinnerEventDisplay[] = []

        for (const batch of batches) {
            const batchResults = await Promise.all(
                batch.map(event => assignCookingTeamToDinnerEvent(d1Client, event.id!, event.cookingTeamId!))
            )
            updatedEvents.push(...batchResults)
        }

        console.info(`🗓️ > SEASON > [ASSIGN_COOKING_TEAMS] Successfully assigned teams to ${updatedEvents.length} dinner events for season ${seasonId}`)

        setResponseStatus(event, 200)
        return {
            seasonId,
            eventCount: updatedEvents.length,
            events: updatedEvents
        }
    } catch (error) {
        return throwH3Error(`🗓️ > SEASON > [ASSIGN_COOKING_TEAMS] Error assigning teams to dinner events for season ${seasonId}`, error)
    }
})
