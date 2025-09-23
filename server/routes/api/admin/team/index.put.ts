// PUT /api/admin/teams - Create team (seasonId in body)

import {defineEventHandler, readBody, H3Error, setResponseStatus, createError} from "h3"
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
    try {
        const {cloudflare} = event.context
        const d1Client = cloudflare.env.DB

        // Read and validate the body
        const rawBody = await readBody(event)

        // Validate using the application schema
        const validationResult = PutTeamSchema.safeParse(rawBody)
        if (!validationResult.success) {
            console.error("👥 > TEAM > [PUT] Validation error:", JSON.stringify(validationResult.error.format()))
            throw createError({
                statusCode: 400,
                message: 'Invalid team data',
                data: validationResult.error
            })
        }

        // Create a new team
        const savedTeam = await createTeam(d1Client, rawBody)

        // Return the saved team with 201 Created status
        setResponseStatus(event, 201)
        return savedTeam
    } catch (error) {
        console.error("👥 > TEAM > Error creating team:", error)

        // If it's a validation error (H3Error), return 400 Bad Request
        if (error instanceof H3Error) {
            console.error("👥 > TEAM > Validation Error:", error.data, error)
            const errorData = error.data || error
            console.error("👥 > TEAM > [PUT] H3Error details:", JSON.stringify(errorData))
            throw createError({
                statusCode: 400,
                message: 'Invalid team input',
                data: errorData
            })
        } else {
            // Otherwise return 500 Internal Server Error
            console.error("👥 > TEAM > [PUT] Server error:", error)
            throw createError({
                statusCode: 500,
                message: '👥 > TEAM > Server Error',
                cause: error
            })
        }
    }
})
