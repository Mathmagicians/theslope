// GET /api/admin/team?seasonId=x - List teams by season
// no seasonId defaults to current season, if one is active

import {defineEventHandler, createError, getValidatedQuery} from "h3"
import {fetchTeams} from "~~/server/data/prismaRepository"
import * as z from 'zod'

// Define schema for query parameters
const querySchema = z.object({
    seasonId: z.coerce.number().int().positive().optional()
})

export default defineEventHandler(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let queryParams
    try {
        queryParams = await getValidatedQuery(event, querySchema.parse)
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
        const { seasonId } = queryParams
        console.info("👥 > TEAM > [GET] Fetching teams", "seasonId", seasonId)
        const teams = await fetchTeams(d1Client, seasonId)
        console.info("👥 > TEAM > Returning teams", "count", teams?.length || 0)
        return teams ? teams : []
    } catch (error) {
        console.error("👥 > TEAM > Error getting teams:", error)
        throw createError({
            statusCode: 500,
            message: '👥 > TEAM > Server Error',
            cause: error
        })
    }
})
