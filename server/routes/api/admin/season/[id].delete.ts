import {defineEventHandler, createError} from "h3"
import {deleteSeason} from "~/server/data/prismaRepository"
import * as z from 'zod'

// Define schema for ID parameter
const idSchema = z.object({
    id: z.coerce.number().int().positive('Season ID must be a positive integer')
})

export default defineEventHandler(async (event) => {
    try {
        const {cloudflare} = event.context
        const d1Client = cloudflare.env.DB
        
        // Validate and get the ID from route params using Zod
        const { id } = await getValidatedRouterParams(event, idSchema.parse)
        
        console.log(`🌞 > SEASON > [DELETE] Deleting season with id ${id}`)
        
        // Delete the season
        const deletedSeason = await deleteSeason(d1Client, id)
        console.info(`🌞 > SEASON > [DELETE] Successfully deleted season ${deletedSeason.shortName}`)
        
        // Return the deleted season
        return deletedSeason
    } catch (error) {
        console.error(`🌞 > SEASON > [DELETE] Error: ${error.message}`)
        
        // For Zod validation errors, return 400
        if (error.name === 'ZodError') {
            throw createError({
                statusCode: 400,
                message: 'Invalid season ID: ' + error.errors[0].message,
                cause: error
            })
        }
        
        // For "not found" errors, return 404
        if (error.message?.includes('Record to delete does not exist')) {
            throw createError({
                statusCode: 404,
                message: 'Season not found',
                cause: error
            })
        }
        
        // For other errors, return 500
        throw createError({
            statusCode: 500,
            message: '🌞 > SEASON > Server Error: ' + error.message,
            cause: error
        })
    }
})