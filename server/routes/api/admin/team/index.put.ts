// PUT /api/admin/teams - Create team (seasonId in body)

import {defineEventHandler, readValidatedBody, setResponseStatus, createError} from "h3"
import {createTeam} from "~~/server/data/prismaRepository"
import {useCookingTeamValidation} from "~/composables/useCookingTeamValidation"

// Get the validation utilities from our composable
const {CookingTeamSchema} = useCookingTeamValidation()

// Create a refined schema for PUT operations that rejects any team with an ID
const PutTeamSchema = CookingTeamSchema.refine(
    team => !team.id,
    {
        message: 'Cannot provide an ID when creating a new team. Use POST to update an existing team.',
        path: ['id']
    }
)

export default defineEventHandler(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let teamData
    try {
        teamData = await readValidatedBody(event, PutTeamSchema.parse)
    } catch (error) {
        console.error("👥 > TEAM > [PUT] Input validation error:", error)
        throw createError({
            statusCode: 400,
            message: 'Invalid input data',
            cause: error
        })
    }

    // Database operations try-catch - separate concerns
    try {
        const savedTeam = await createTeam(d1Client, teamData)

        // Return the saved team with 201 Created status
        setResponseStatus(event, 201)
        return savedTeam
    } catch (error) {
        console.error("👥 > TEAM > Error creating team:", error)
        throw createError({
            statusCode: 500,
            message: '👥 > TEAM > Server Error',
            cause: error
        })
    }
})
