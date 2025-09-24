
// GET /api/admin/team/[id] - Get team details with members

import {defineEventHandler, createError, getValidatedRouterParams} from "h3"
import {fetchTeam} from "~~/server/data/prismaRepository"
import * as z from 'zod'

// Define schema for ID parameter
const idSchema = z.object({
    id: z.coerce.number().int().positive('Team ID must be a positive integer')
})

export default defineEventHandler(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let id
    try {
        const params = await getValidatedRouterParams(event, idSchema.parse)
        id = params.id
    } catch (error) {
        console.error("👥 > TEAM > [GET] Input validation error:", error)
        throw createError({
            statusCode: 400,
            message: 'Invalid input data',
            cause: error
        })
    }

    // Database operations try-catch - separate concerns
    try {
        console.log(`👥 > TEAM > [GET] Fetching team with id ${id}`)
        const team = await fetchTeam(d1Client, id)

        if (!team) {
            throw createError({
                statusCode: 404,
                message: 'Team not found'
            })
        }

        console.info(`👥 > TEAM > [GET] Successfully fetched team ${team.name}`)
        return team
    } catch (error) {
        console.error("👥 > TEAM > [GET] Error fetching team:", error)

        // For "not found" errors, return 404
        if (error.statusCode === 404) {
            throw error
        }

        throw createError({
            statusCode: 500,
            message: '👥 > TEAM > Server Error',
            cause: error
        })
    }
})
