// GET /api/admin/team/[id] - Fetch cooking team detail with all relations

import {defineEventHandler, createError, getValidatedRouterParams} from "h3"
import {fetchTeam} from "~~/server/data/prismaRepository"
import type {CookingTeamDetail} from "~/composables/useCookingTeamValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import * as z from 'zod'

const {throwH3Error} = eventHandlerHelper

/**
 * Schema for ID parameter validation
 * ADR-002: Validate all input with Zod schemas
 */
const idSchema = z.object({
    id: z.coerce.number().int().positive('Team ID must be a positive integer')
})

/**
 * GET /api/admin/team/:id
 *
 * Fetch cooking team detail with all relations (ADR-009: Detail pattern)
 * Returns: CookingTeamDetail with assignments, dinnerEvents array, cookingDaysCount
 *
 * @throws 400 - Invalid team ID
 * @throws 404 - Team not found
 * @throws 500 - Database error
 */
export default defineEventHandler(async (event): Promise<CookingTeamDetail> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY (ADR-002)
    let id: number
    try {
        const params = await getValidatedRouterParams(event, idSchema.parse)
        id = params.id
    } catch (error) {
        console.error("👥 > TEAM > [GET] Input validation error:", error)
        throw createError({
            statusCode: 400,
            message: 'Invalid team ID',
            cause: error
        })
    }

    // Database operations try-catch - separate concerns (ADR-002)
    try {
        console.info(`👥 > TEAM > [GET] Fetching team detail for ID ${id}`)

        const team = await fetchTeam(id, d1Client)

        if (!team) {
            console.warn(`👥 > TEAM > [GET] Team not found: ID ${id}`)
            throw createError({
                statusCode: 404,
                message: `Team with ID ${id} not found`
            })
        }

        console.info(`👥 > TEAM > [GET] Successfully fetched team ${team.name} (ID: ${id})`)
        return team
    } catch (error: unknown) {
        // Re-throw H3 errors (like 404)
        if (error.statusCode) throw error

        // Handle database errors
        throwH3Error(`👥 > TEAM > [GET] Error fetching team with ID ${id}`, error)
    }
})
