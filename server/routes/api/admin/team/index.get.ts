// GET /api/admin/team?seasonId=x - List teams by season
// no seasonId defaults to current season, if one is active

import {defineEventHandler, getValidatedQuery} from "h3"
import {fetchTeams} from "~~/server/data/prismaRepository"
import * as z from 'zod'
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import type {CookingTeamWithMembers} from '~/composables/useCookingTeamValidation'

const {throwH3Error} = eventHandlerHelper

// Define schema for query parameters
const querySchema = z.object({
    seasonId: z.coerce.number().int().positive().optional()
})

export default defineEventHandler(async (event): Promise<CookingTeamWithMembers[]> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let seasonId!: number | undefined
    try {
        const queryParams = await getValidatedQuery(event, querySchema.parse)
        seasonId = queryParams.seasonId
    } catch (error) {
        return throwH3Error('👥 > TEAM > [GET] Input validation error', error)
    }

    // Database operations try-catch - separate concerns
    try {
        console.info("👥 > TEAM > [GET] Fetching teams", "seasonId", seasonId)
        const teams = await fetchTeams(d1Client, seasonId)
        console.info("👥 > TEAM > [GET] Returning teams", "count", teams?.length || 0)
        return teams ?? []
    } catch (error) {
        return throwH3Error('👥 > TEAM > [GET] Error getting teams', error)
    }
})
