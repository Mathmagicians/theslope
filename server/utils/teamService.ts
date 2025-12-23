import {fetchSeason, createTeam, updateTeam} from '~~/server/data/prismaRepository'
import {assignCookingTeamToDinnerEvent} from '~~/server/data/financesRepository'
import {useSeason} from '~/composables/useSeason'
import {useCookingTeam} from '~/composables/useCookingTeam'
import type {CookingTeamCreate, CookingTeamUpdate, CookingTeamDetail} from '~/composables/useCookingTeamValidation'
import type {DinnerEventDisplay} from '~/composables/useBookingValidation'

export interface TeamOperationResult {
    teams: CookingTeamDetail[]
    eventsAssigned: number
}

/**
 * Create teams and automatically assign affinities + dinner events
 * Reusable by team endpoints and import
 */
export async function createTeamsWithAssignments(
    d1Client: D1Database,
    seasonId: number,
    teamsToCreate: CookingTeamCreate[]
): Promise<TeamOperationResult> {
    const LOG = '👥 > TEAM_SERVICE > '

    // Step 1: Create teams
    console.info(`${LOG} Creating ${teamsToCreate.length} team(s) for season ${seasonId}`)
    const createdTeams = await Promise.all(
        teamsToCreate.map(team => createTeam(d1Client, team))
    )
    console.info(`${LOG} Created ${createdTeams.length} team(s)`)

    // Step 2: Assign affinities and events for the season
    const eventsAssigned = await assignAffinitiesAndEvents(d1Client, seasonId)

    return {
        teams: createdTeams,
        eventsAssigned
    }
}

/**
 * Update team and reassign affinities + dinner events for the season
 */
export async function updateTeamWithAssignments(
    d1Client: D1Database,
    teamId: number,
    teamData: CookingTeamUpdate
): Promise<TeamOperationResult> {
    const LOG = '👥 > TEAM_SERVICE > '

    // Step 1: Update team
    console.info(`${LOG} Updating team ${teamId}`)
    const updatedTeam = await updateTeam(d1Client, teamId, teamData)
    console.info(`${LOG} Updated team ${updatedTeam.name}`)

    // Step 2: Reassign affinities and events for the season
    const eventsAssigned = await assignAffinitiesAndEvents(d1Client, updatedTeam.seasonId)

    return {
        teams: [updatedTeam],
        eventsAssigned
    }
}

/**
 * Assign team affinities from member affinities, then assign teams to dinner events
 * Core logic extracted from assign-team-affinities.post.ts and assign-cooking-teams.post.ts
 */
export async function assignAffinitiesAndEvents(
    d1Client: D1Database,
    seasonId: number
): Promise<number> {
    const LOG = '👥 > TEAM_SERVICE > '

    // Fetch season with teams
    const season = await fetchSeason(d1Client, seasonId)
    if (!season) {
        throw new Error(`Season ${seasonId} not found`)
    }

    // Get composable functions
    const {assignAffinitiesToTeams, assignTeamsToEvents, chunkTeamAssignments} = useSeason()
    const {chunkTeamAffinities} = useCookingTeam()

    // Step 1: Compute and save team affinities
    console.info(`${LOG} Assigning affinities for season ${seasonId}`)
    const teamsWithAffinities = assignAffinitiesToTeams(season)
    const affinityBatches = chunkTeamAffinities(teamsWithAffinities)

    for (const batch of affinityBatches) {
        await Promise.all(
            batch.map(team => updateTeam(d1Client, team.id!, {id: team.id!, affinity: team.affinity}))
        )
    }
    console.info(`${LOG} Assigned affinities to ${teamsWithAffinities.length} teams`)

    // Refetch season to get updated team affinities
    const updatedSeason = await fetchSeason(d1Client, seasonId)
    if (!updatedSeason) {
        throw new Error(`Season ${seasonId} not found after affinity update`)
    }

    // Step 2: Compute and save team-to-event assignments
    console.info(`${LOG} Assigning teams to dinner events for season ${seasonId}`)
    const eventsWithAssignments = assignTeamsToEvents(updatedSeason)
        .filter(event => event.id && event.cookingTeamId)

    const eventBatches = chunkTeamAssignments(eventsWithAssignments)
    const updatedEvents: DinnerEventDisplay[] = []

    for (const batch of eventBatches) {
        const batchResults = await Promise.all(
            batch.map(event => assignCookingTeamToDinnerEvent(d1Client, event.id!, event.cookingTeamId!))
        )
        updatedEvents.push(...batchResults)
    }

    console.info(`${LOG} Assigned teams to ${updatedEvents.length} dinner events`)
    return updatedEvents.length
}
