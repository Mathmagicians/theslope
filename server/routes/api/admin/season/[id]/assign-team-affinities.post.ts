
import {defineEventHandler, getValidatedRouterParams, setResponseStatus} from "h3"
import {fetchSeason, updateTeam} from "~~/server/data/prismaRepository"
import {useSeason} from "~/composables/useSeason"
import {useCookingTeamValidation} from "~/composables/useCookingTeamValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {z} from "zod"

const {h3eFromCatch} = eventHandlerHelper
const {assignAffinitiesToTeams} = useSeason()
const {CookingTeamSchema, CookingTeamAssignmentSchema} = useCookingTeamValidation()

// Create input schema for assignments (omit read-only inhabitant field)
const InputAssignmentSchema = CookingTeamAssignmentSchema.omit({ inhabitant: true })

// Create input schema for team updates (use input assignments)
const InputTeamSchema = CookingTeamSchema.extend({
    assignments: z.array(InputAssignmentSchema).optional()
})

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
        const h3e = h3eFromCatch('👥 > SEASON > [ASSIGN_AFFINITIES] Input validation error', error)
        console.error(`👥 > SEASON > [ASSIGN_AFFINITIES] ${h3e.statusMessage}`, error)
        throw h3e
    }

    // Business logic try-catch - separate concerns
    try {
        console.info(`👥 > SEASON > [ASSIGN_AFFINITIES] Assigning affinities to teams for season ${seasonId}`)

        // Fetch season from database with teams (repository returns domain object with Date objects)
        const season = await fetchSeason(d1Client, seasonId)
        if (!season) {
            const h3e = h3eFromCatch(`👥 > SEASON > [ASSIGN_AFFINITIES] Season ${seasonId} not found`, new Error('Not found'))
            h3e.statusCode = 404
            throw h3e
        }

        // Compute affinities for teams using composable
        const teamsWithAffinities = assignAffinitiesToTeams(season)

        // Update each team with computed affinity
        // Parse through InputTeamSchema to strip read-only inhabitant field from assignments
        const updatedTeams = await Promise.all(
            teamsWithAffinities.map(team => {
                const teamForUpdate = InputTeamSchema.parse(team)
                return updateTeam(d1Client, team.id!, teamForUpdate)
            })
        )

        console.info(`👥 > SEASON > [ASSIGN_AFFINITIES] Successfully assigned affinities to ${updatedTeams.length} teams for season ${seasonId}`)

        setResponseStatus(event, 200)
        return {
            seasonId,
            teamCount: updatedTeams.length,
            teams: updatedTeams
        }
    } catch (error) {
        const h3e = h3eFromCatch(`👥 > SEASON > [ASSIGN_AFFINITIES] Error assigning affinities to teams for season ${seasonId}`, error)
        console.error(`👥 > SEASON > [ASSIGN_AFFINITIES] ${h3e.statusMessage}`, error)
        throw h3e
    }
})
