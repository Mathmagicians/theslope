import {defineEventHandler, getValidatedRouterParams, setResponseStatus} from "h3"
import {deleteSeason} from "~~/server/data/prismaRepository"
import type {Season} from "~/composables/useSeasonValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import * as z from 'zod'
const {throwH3Error} = eventHandlerHelper

// Define schema for ID parameter
const idSchema = z.object({
    id: z.coerce.number().int().positive('Season ID must be a positive integer')
})

export default defineEventHandler(async (event): Promise<Season> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let id!: number
    try {
        ( {id} = await getValidatedRouterParams(event, idSchema.parse))
    } catch (error) {
        return throwH3Error('🌞 > DELETE SEASON > Invalid season ID', error)
    }

    // Database operations try-catch - separate concerns
    try {
        console.info(`🌞 > DELETE SEASON > Deleting season with id ${id}`)
        const deletedSeason = await deleteSeason(d1Client, id)
        console.info(`🌞 > DELETE SEASON > Successfully deleted season ${deletedSeason.shortName}`)
        setResponseStatus(event, 200)
        return deletedSeason
    } catch (error) {
        return throwH3Error(`🌞 > DELETE SEASON > Error deleting season with id ${id}`, error)
    }
})
