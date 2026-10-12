// GET /api/admin/team/[id] - Fetch cooking team detail with all relations

import {defineEventHandler, createError, getValidatedRouterParams} from "h3"
import {fetchTeam} from "~~/server/data/prismaRepository"
import type {CookingTeamDetail} from "~/composables/useCookingTeamValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {idParams} from '~/composables/useCoreValidation'

const {throwH3Error} = eventHandlerHelper

/**
 * Schema for ID parameter validation
 * ADR-002: Validate all input with Zod schemas
 */
const paramSchema = idParams('id')

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
    let id!: number
    try {
        const params = await getValidatedRouterParams(event, paramSchema.parse)
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
        // throwH3Error already handles re-throwing H3Errors (line 54-57 in eventHandlerHelper)
        return throwH3Error(`👥 > TEAM > [GET] Error fetching team with ID ${id}`, error)
    }
})
