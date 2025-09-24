import {defineEventHandler, createError, getValidatedRouterParams} from "h3"
import {deleteSeason} from "~~/server/data/prismaRepository"
import * as z from 'zod'

// Define schema for ID parameter
const idSchema = z.object({
    id: z.coerce.number().int().positive('Season ID must be a positive integer')
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
        console.error("🌞 > SEASON > [DELETE] Input validation error:", error)
        throw createError({
            statusCode: 400,
            message: 'Invalid input data',
            cause: error
        })
    }

    // Database operations try-catch - separate concerns
    try {
        console.log(`🌞 > SEASON > [DELETE] Deleting season with id ${id}`)
        const deletedSeason = await deleteSeason(d1Client, id)
        console.info(`🌞 > SEASON > [DELETE] Successfully deleted season ${deletedSeason.shortName}`)
        return deletedSeason
    } catch (error) {
        console.error("🌞 > SEASON > [DELETE] Error deleting season:", error)

        // For "not found" errors, return 404
        if (error.message?.includes('Record to delete does not exist')) {
            throw createError({
                statusCode: 404,
                message: 'Season not found',
                cause: error
            })
        }

        throw createError({
            statusCode: 500,
            message: '🌞 > SEASON > Server Error',
            cause: error
        })
    }
})