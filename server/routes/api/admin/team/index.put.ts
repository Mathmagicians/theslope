// PUT /api/admin/teams - Create team (seasonId in body)

import {defineEventHandler, readValidatedBody, setResponseStatus} from "h3"
import {createTeam} from "~~/server/data/prismaRepository"
import type {CookingTeamDetail, CookingTeamCreate} from "~/composables/useCookingTeamValidation"
import {useCookingTeamValidation} from "~/composables/useCookingTeamValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {throwH3Error} = eventHandlerHelper

// Get the validation schema from composable (ADR-009)
const {CookingTeamCreateSchema} = useCookingTeamValidation()

export default defineEventHandler(async (event): Promise<CookingTeamDetail> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let teamData!: CookingTeamCreate
    try {
        teamData = await readValidatedBody(event, CookingTeamCreateSchema.parse)
    } catch (error) {
        throwH3Error("👥 > TEAM > [PUT] Input validation error", error)
        return undefined as never
    }

    // Database operations try-catch - separate concerns
    try {
        const savedTeam = await createTeam(d1Client, teamData)

        // Return the saved team with 201 Created status
        setResponseStatus(event, 201)
        return savedTeam
    } catch (error) {
        throwH3Error("👥 > TEAM > [PUT] Error creating team", error)
        return undefined as never
    }
})
