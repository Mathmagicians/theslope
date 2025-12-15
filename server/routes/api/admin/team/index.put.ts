// PUT /api/admin/teams - Create team(s) and auto-assign affinities + dinner events

import {defineEventHandler, readBody, setResponseStatus} from "h3"
import {createTeamsWithAssignments} from "~~/server/utils/teamService"
import type {CookingTeamDetail, CookingTeamCreate} from "~/composables/useCookingTeamValidation"
import {useCookingTeamValidation} from "~/composables/useCookingTeamValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {z} from "zod"

const {throwH3Error} = eventHandlerHelper

const {CookingTeamCreateSchema} = useCookingTeamValidation()

export default defineEventHandler(async (event): Promise<CookingTeamDetail[]> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let teams!: CookingTeamCreate[]

    try {
        const body = await readBody(event)
        teams = z.array(CookingTeamCreateSchema).parse(body)
    } catch (error) {
        return throwH3Error("👥 > TEAM > [PUT] Input validation error", error)
    }

    // All teams must be for the same season
    const seasonIds = [...new Set(teams.map(t => t.seasonId))]
    if (seasonIds.length !== 1) {
        return throwH3Error("👥 > TEAM > [PUT] All teams must be for the same season", new Error('Multiple season IDs'), 400)
    }
    const seasonId = seasonIds[0]

    // Database operations try-catch - separate concerns
    try {
        console.info(`👥 > TEAM > [PUT] Creating ${teams.length} team(s) with auto-assignment`)

        const result = await createTeamsWithAssignments(d1Client, seasonId, teams)

        console.info(`👥 > TEAM > [PUT] Created ${result.teams.length} team(s), assigned ${result.eventsAssigned} events`)
        setResponseStatus(event, 201)

        return result.teams
    } catch (error) {
        return throwH3Error("👥 > TEAM > [PUT] Error creating team(s)", error)
    }
})
