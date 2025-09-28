import {defineEventHandler, createError, getValidatedRouterParams} from "h3"
import {deleteSeason} from "~~/server/data/prismaRepository"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import * as z from 'zod'
const {h3eFromCatch} = eventHandlerHelper

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
        ( {id} = await getValidatedRouterParams(event, idSchema.parse))
    } catch (error) {
        const h3e = h3eFromCatch('🌞> DELETE SEASON >  Invalid season ID:', error)
        console.error(h3e.message)
        throw h3e
    }

    // Database operations try-catch - separate concerns
    try {
        console.info(`🌞 > DELETE SEASON >  Deleting season with id ${id}`)
        const deletedSeason = await deleteSeason(d1Client, id)
        console.info(`🌞 DELETE SEASON >  Successfully deleted season ${deletedSeason.shortName}`)
        return deletedSeason
    } catch (error) {
        const h3e = h3eFromCatch('🌞 > DELETE SEASON >  Error deleting season:', error)
        console.error(h3e.message)

        // For "not found" errors, return 404
        if (error?.message?.includes('Record to delete does not exist')) {
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
