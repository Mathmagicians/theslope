import {defineEventHandler, createError, getValidatedRouterParams} from "h3"
import {deleteTeam} from "~~/server/data/prismaRepository"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import * as z from 'zod'
import type {CookingTeam} from '~/composables/useCookingTeamValidation'

const {h3eFromCatch} = eventHandlerHelper

// Define schema for ID parameter
const idSchema = z.object({
    id: z.coerce.number().int().positive('Team ID must be a positive integer')
})

export default defineEventHandler(async (event): Promise<CookingTeam> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let id
    try {
        const params = await getValidatedRouterParams(event, idSchema.parse)
        id = params.id
    } catch (error) {
        console.error("👥 > TEAM > [DELETE] Input validation error:", error)
        throw createError({
            statusCode: 400,
            message: 'Invalid input data',
            cause: error
        })
    }

    // Database operations try-catch - separate concerns
    try {
        console.log(`👥 > TEAM > [DELETE] Deleting team with id ${id}`)
        const deletedTeam = await deleteTeam(d1Client, id)
        console.info(`👥 > TEAM > [DELETE] Successfully deleted team ${deletedTeam.name}`)
        return deletedTeam
    } catch (error) {
        const h3e = h3eFromCatch(`👥 > TEAM > [DELETE] Error deleting team with id ${id}`, error)
        console.error(`👥 > TEAM > [DELETE] ${h3e.statusMessage}`, error)
        throw h3e
    }
})
