//Create GET /api/admin/teams?seasonId=x - List teams by season
// no seasonId defaults to current season, if one is active

import {defineEventHandler, createError, getQuery} from "h3"
import {fetchTeams} from "~~/server/data/prismaRepository"
import * as z from 'zod'

// Define schema for query parameters
const querySchema = z.object({
    seasonId: z.coerce.number().int().positive().optional()
})

export default defineEventHandler(async (event) => {
    try {
        const {cloudflare} = event.context
        const d1Client = cloudflare.env.DB

        // Get and validate query parameters
        const query = getQuery(event)
        const validationResult = querySchema.safeParse(query)

        if (!validationResult.success) {
            console.error("👥 > TEAM > [GET] Query validation error:", JSON.stringify(validationResult.error.format()))
            throw createError({
                statusCode: 400,
                message: 'Invalid query parameters',
                data: validationResult.error
            })
        }

        const { seasonId } = validationResult.data

        console.log(`👥 > TEAM > [GET] Fetching teams${seasonId ? ` for season ${seasonId}` : ''}`)
        const teams = await fetchTeams(d1Client, seasonId)
        console.info(`👥 > TEAM > Returning ${teams?.length || 0} teams`)

        return teams ? teams : []
    } catch (error) {
        console.error("👥 > TEAM > Error getting teams:", error)

        // For Zod validation errors, return 400
        if (error.name === 'ZodError') {
            throw createError({
                statusCode: 400,
                message: 'Invalid query parameters: ' + error.errors[0].message,
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
