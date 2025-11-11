import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {h3eFromCatch} = eventHandlerHelper

import {defineEventHandler, createError, getValidatedRouterParams} from "h3"
import {fetchTeam} from "~~/server/data/prismaRepository"
import type {CookingTeamWithMembers} from '~/composables/useCookingTeamValidation'
import * as z from 'zod'

// Define schema for ID parameter
const idSchema = z.object({
    id: z.coerce.number().int().positive('Team ID must be a positive integer')
})

export default defineEventHandler(async (event): Promise<CookingTeamWithMembers> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let id
    try {
        const params = await getValidatedRouterParams(event, idSchema.parse)
        id = params.id
    } catch (error) {
        const h3e = h3eFromCatch('👥 > TEAM > [GET] Input validation error for team', error)
        console.warn("👥 > TEAM > [GET] Input validation error:", h3e.statusMessage)
        throw h3e
    }

    // Database operations try-catch - separate concerns
    try {
        console.info("👥 > TEAM > [GET] Fetching team", "id", id)
        const team = await fetchTeam(d1Client, id)

        if (team) {
            console.info("👥 > TEAM > [GET] fetched team", "name", team.name)
            return team
        }
    } catch (error: any) {
        const h3e = h3eFromCatch(`👥 > TEAM > [GET] Error fetching team with id ${id}`, error)
        console.error(`👥 > TEAM > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
    throw createError({
        statusCode: 404,
        message: `Team with ID ${id} not found`
    })
})
