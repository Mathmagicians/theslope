
// GET /api/admin/team/[id] - Get team details with members

import {defineEventHandler, createError, getValidatedRouterParams} from "h3"
import {fetchTeam} from "~~/server/data/prismaRepository"
import * as z from 'zod'

// Define schema for ID parameter
const idSchema = z.object({
    id: z.coerce.number().int().positive('Team ID must be a positive integer')
})

export default defineEventHandler(async (event) => {
    try {
        const {cloudflare} = event.context
        const d1Client = cloudflare.env.DB

        // Validate and get the ID from route params using Zod
        const { id } = await getValidatedRouterParams(event, idSchema.parse)

        console.log(`=e > TEAM > [GET] Fetching team with id ${id}`)

        // Fetch the team with members
        const team = await fetchTeam(d1Client, id)

        if (!team) {
            throw createError({
                statusCode: 404,
                message: 'Team not found'
            })
        }

        console.info(`=e > TEAM > [GET] Successfully fetched team ${team.name}`)

        // Return the team
        return team
    } catch (error) {
        console.error(`=e > TEAM > [GET] Error: ${error.message}`)

        // For Zod validation errors, return 400
        if (error.name === 'ZodError') {
            throw createError({
                statusCode: 400,
                message: 'Invalid team ID: ' + error.errors[0].message,
                cause: error
            })
        }

        // For "not found" errors, return 404
        if (error.statusCode === 404) {
            throw error
        }

        // For other errors, return 500
        throw createError({
            statusCode: 500,
            message: '=e > TEAM > Server Error: ' + error.message,
            cause: error
        })
    }
})
