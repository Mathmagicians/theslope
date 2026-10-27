import {defineEventHandler, getValidatedRouterParams, setResponseStatus} from "h3"
import {fetchSeason, updateTeam} from "~~/server/data/prismaRepository"
import {useSeason} from "~/composables/useSeason"
import {useCookingTeam} from "~/composables/useCookingTeam"
import type {CookingTeamDetail} from "~/composables/useCookingTeamValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {idParams} from '~/composables/useCoreValidation'

const {throwH3Error} = eventHandlerHelper

const paramSchema = idParams('id')

// ADR-009: Mutations return Detail type (full team with all relations)
type AssignAffinitiesResponse = {
    seasonId: number
    teamCount: number
    teams: CookingTeamDetail[]
}

export default defineEventHandler(async (event): Promise<AssignAffinitiesResponse> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let seasonId!: number
    try {
        const params = await getValidatedRouterParams(event, paramSchema.parse)
        seasonId = params.id
    } catch (error) {
        return throwH3Error('👥 > SEASON > [ASSIGN_AFFINITIES] Input validation error', error)
    }

    // Business logic try-catch - separate concerns
    try {
        console.info(`👥 > SEASON > [ASSIGN_AFFINITIES] Assigning affinities to teams for season ${seasonId}`)

        // Fetch season from database with teams (repository returns domain object with Date objects)
        const season = await fetchSeason(d1Client, seasonId)
        if (!season) {
            return throwH3Error(`👥 > SEASON > [ASSIGN_AFFINITIES] Season ${seasonId} not found`, new Error('Not found'), 404)
        }

        // Compute affinities for teams using composable (call at request time, not module load time)
        const {assignAffinitiesToTeams} = useSeason()
        const {chunkTeamAffinities} = useCookingTeam()
        const teamsWithAffinities = assignAffinitiesToTeams(season)

        // Process in batches to avoid D1 rate limits
        const batches = chunkTeamAffinities(teamsWithAffinities)
        const updatedTeams: CookingTeamDetail[] = []

        for (const batch of batches) {
            const batchResults = await Promise.all(
                batch.map(team => {
                    // CookingTeamUpdate: only id (required) + optional updateable fields (name, seasonId, affinity)
                    const teamForUpdate = {
                        id: team.id,
                        affinity: team.affinity
                    }
                    return updateTeam(d1Client, team.id, teamForUpdate)
                })
            )
            updatedTeams.push(...batchResults)
        }

        console.info(`👥 > SEASON > [ASSIGN_AFFINITIES] Successfully assigned affinities to ${updatedTeams.length} teams for season ${seasonId}`)

        setResponseStatus(event, 200)
        return {
            seasonId,
            teamCount: updatedTeams.length,
            teams: updatedTeams
        }
    } catch (error) {
        return throwH3Error(`👥 > SEASON > [ASSIGN_AFFINITIES] Error assigning affinities to teams for season ${seasonId}`, error)
    }
})
