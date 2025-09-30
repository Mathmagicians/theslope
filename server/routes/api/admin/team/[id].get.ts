import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {h3eFromCatch, h3eFromPrismaError} = eventHandlerHelper

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
        const h3e = h3eFromCatch('👥 > TEAM > [GET] Input validation error for team', error)
        console.warn("👥 > TEAM > [GET] Input validation error:", h3e.statusMessage)
        throw h3e
    }

    let team
    // Database operations try-catch - separate concerns
    try {
        console.info("👥 > TEAM > [GET] Fetching team", "id", id)
        team = await fetchTeam(d1Client, id)
    } catch (error: any) {
        const h3e = h3eFromCatch('Could not fetch team', error)
        console.warn(`"👥 > TEAM > [GET] Error fetching team: ${h3e.statusMessage}`)
        throw h3e
    }

    if (!team) {
        const h3e = h3eFromCatch('Record does not exist', new Error(`Team with ID ${id} not found`))
        console.warn(`👨‍💻 > USER > Validation failed: ${h3e.statusMessage}`)
        throw h3e
    }
    console.info("👥 > TEAM > [GET] fetched team", "name", team.name)
    return team
})
