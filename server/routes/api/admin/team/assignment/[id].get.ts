import {defineEventHandler, getValidatedRouterParams, createError} from "h3"
import {fetchTeamAssignment} from "~~/server/data/prismaRepository"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import * as z from 'zod'

const {h3eFromCatch} = eventHandlerHelper

// Define schema for ID parameter
const idSchema = z.object({
    id: z.coerce.number().int().positive('Assignment ID must be a positive integer')
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
        const h3e = h3eFromCatch('👥🔗 > ASSIGNMENT > [GET] Input validation error', error)
        console.error(`👥🔗 > ASSIGNMENT > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }

    // Database operations try-catch - separate concerns
    try {
        console.info(`👥🔗 > ASSIGNMENT > [GET] Fetching assignment with id ${id}`)
        const assignment = await fetchTeamAssignment(d1Client, id)

        if (!assignment) {
            throw createError({
                statusCode: 404,
                message: `Team assignment with ID ${id} not found`
            })
        }

        console.info(`👥🔗 > ASSIGNMENT > [GET] Returning assignment ${assignment.id}`)
        return assignment
    } catch (error) {
        const h3e = h3eFromCatch(`👥🔗 > ASSIGNMENT > [GET] Error fetching assignment with id ${id}`, error)
        console.error(`👥🔗 > ASSIGNMENT > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
})