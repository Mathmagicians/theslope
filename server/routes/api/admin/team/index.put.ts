// PUT /api/admin/teams - Create team(s) - accepts single team or array

import {defineEventHandler, readBody, setResponseStatus} from "h3"
import {createTeam} from "~~/server/data/prismaRepository"
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

    // Database operations try-catch - separate concerns
    try {
        console.info(`👥 > TEAM > [PUT] Creating ${teams.length} team(s)`)

        const savedTeams = await Promise.all(
            teams.map(team => createTeam(d1Client, team))
        )

        console.info(`👥 > TEAM > [PUT] Created ${savedTeams.length} team(s)`)
        setResponseStatus(event, 201)

        return savedTeams
    } catch (error) {
        return throwH3Error("👥 > TEAM > [PUT] Error creating team(s)", error)
    }
})
