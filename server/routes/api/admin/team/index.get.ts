// GET /api/admin/team?seasonId=x - List teams by season
// no seasonId defaults to current season, if one is active

import {defineEventHandler, getValidatedQuery} from "h3"
import {fetchTeams} from "~~/server/data/prismaRepository"
import * as z from 'zod'
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import type {CookingTeamWithMembers} from '~/composables/useCookingTeamValidation'

const {h3eFromCatch} = eventHandlerHelper

// Define schema for query parameters
const querySchema = z.object({
    seasonId: z.coerce.number().int().positive().optional()
})

export default defineEventHandler(async (event): Promise<CookingTeamWithMembers[]> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let queryParams
    try {
        queryParams = await getValidatedQuery(event, querySchema.parse)
    } catch (error) {
        const h3e = h3eFromCatch('Input validation error', error)
        console.error("👥 > TEAM > [GET]: " + h3e.message, h3e)
        throw h3e
    }

    // Database operations try-catch - separate concerns
    try {
        const {seasonId} = queryParams
        console.info("👥 > TEAM > [GET] Fetching teams", "seasonId", seasonId)
        const teams = await fetchTeams(d1Client, seasonId)
        console.info("👥 > TEAM > [GET] Returning teams", "count", teams?.length || 0)
        return teams ?? []
    } catch (error) {
        const h3e = h3eFromCatch('Error getting teams: ', error)
        console.error("👥 > TEAM > [GET]: " + h3e.message, h3e)
        throw h3e
    }
})
