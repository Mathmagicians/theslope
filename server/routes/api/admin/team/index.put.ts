// PUT /api/admin/teams - Create team (seasonId in body)

import {defineEventHandler, readValidatedBody, setResponseStatus} from "h3"
import {createTeam} from "~~/server/data/prismaRepository"
import {useCookingTeamValidation, type CookingTeamDetail, type CookingTeamCreate} from "~/composables/useCookingTeamValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {throwH3Error} = eventHandlerHelper

// Get the validation utilities from our composable
const {CookingTeamSchema, CookingTeamAssignmentSchema} = useCookingTeamValidation()

// Create schema for input validation - team without id, with optional assignments
const CookingTeamCreateSchema = CookingTeamSchema.extend({
    assignments: CookingTeamAssignmentSchema.omit({ id: true, cookingTeamId: true }).array().optional()
}).omit({ id: true })

export default defineEventHandler(async (event): Promise<CookingTeamDetail> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let teamData!: CookingTeamCreate
    try {
        teamData = await readValidatedBody(event, CookingTeamCreateSchema.parse)
    } catch (error) {
        return throwH3Error("👥 > TEAM > [PUT] Input validation error", error)
    }

    // Database operations try-catch - separate concerns
    try {
        const savedTeam = await createTeam(d1Client, teamData)

        // Return the saved team with 201 Created status
        setResponseStatus(event, 201)
        return savedTeam
    } catch (error) {
        return throwH3Error("👥 > TEAM > [PUT] Error creating team", error)
    }
})
