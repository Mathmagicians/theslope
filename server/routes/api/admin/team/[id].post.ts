// POST /api/admin/teams/[id] - Update team, only if season is not in the past

import {defineEventHandler, createError, getValidatedRouterParams, readBody} from "h3"
import {updateTeam} from "~~/server/data/prismaRepository"
import {useCookingTeamValidation} from "~/composables/useCookingTeamValidation"
import * as z from 'zod'

// Define schema for ID parameter
const idSchema = z.object({
    id: z.coerce.number().int().positive('Team ID must be a positive integer')
})

// Get the validation utilities from our composable
const {CookingTeamSchema} = useCookingTeamValidation()

// Create a schema for POST operations (partial updates)
const PostTeamSchema = CookingTeamSchema.partial().omit({ id: true })

export default defineEventHandler(async (event) => {
    try {
        const {cloudflare} = event.context
        const d1Client = cloudflare.env.DB

        // Validate and get the ID from route params using Zod
        const { id } = await getValidatedRouterParams(event, idSchema.parse)

        // Read and validate the body
        const rawBody = await readBody(event)

        // Validate using the application schema
        const validationResult = PostTeamSchema.safeParse(rawBody)
        if (!validationResult.success) {
            console.error("👥 > TEAM > [POST] Validation error:", JSON.stringify(validationResult.error.format()))
            throw createError({
                statusCode: 400,
                message: 'Invalid team data',
                data: validationResult.error
            })
        }

        console.log(`👥 > TEAM > [POST] Updating team with id ${id}`)

        // Update the team
        const updatedTeam = await updateTeam(d1Client, id, rawBody)

        console.info(`👥 > TEAM > [POST] Successfully updated team ${updatedTeam.name}`)

        // Return the updated team
        return updatedTeam
    } catch (error) {
        console.error(`👥 > TEAM > [POST] Error: ${error.message}`)

        // For Zod validation errors, return 400
        if (error.name === 'ZodError') {
            throw createError({
                statusCode: 400,
                message: 'Invalid team ID: ' + error.errors[0].message,
                cause: error
            })
        }

        // For "not found" errors, return 404
        if (error.message?.includes('Record to update not found')) {
            throw createError({
                statusCode: 404,
                message: 'Team not found',
                cause: error
            })
        }

        // For other errors, return 500
        throw createError({
            statusCode: 500,
            message: '👥 > TEAM > Server Error: ' + error.message,
            cause: error
        })
    }
})
