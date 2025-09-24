// POST /api/admin/teams/[id] - Update team, only if season is not in the past

import {defineEventHandler, createError, getValidatedRouterParams, readValidatedBody} from "h3"
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
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let id, teamData
    try {
        const params = await getValidatedRouterParams(event, idSchema.parse)
        id = params.id
        teamData = await readValidatedBody(event, PostTeamSchema.parse)
    } catch (error) {
        console.error("👥 > TEAM > [POST] Input validation error:", error)
        throw createError({
            statusCode: 400,
            message: 'Invalid input data',
            cause: error
        })
    }

    // Database operations try-catch - separate concerns
    try {
        console.log(`👥 > TEAM > [POST] Updating team with id ${id}`)
        const updatedTeam = await updateTeam(d1Client, id, teamData)
        console.info(`👥 > TEAM > [POST] Successfully updated team ${updatedTeam.name}`)
        return updatedTeam
    } catch (error) {
        console.error("👥 > TEAM > [POST] Error updating team:", error)

        // For "not found" errors, return 404
        if (error.message?.includes('Record to update not found')) {
            throw createError({
                statusCode: 404,
                message: 'Team not found',
                cause: error
            })
        }

        throw createError({
            statusCode: 500,
            message: '👥 > TEAM > Server Error',
            cause: error
        })
    }
})
