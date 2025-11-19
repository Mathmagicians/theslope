import {fetchSeason} from "~~/server/data/prismaRepository"
import type {Season} from "~/composables/useSeasonValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import z from "zod"

const {throwH3Error} = eventHandlerHelper

const idSchema = z.object({
    id: z.number({ coerce: true }).positive().int()
})

export default defineEventHandler(async (event): Promise<Season> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let id
    try {
        const params = await getValidatedRouterParams(event, idSchema.parse)
        id = params.id
    } catch (error) {
        console.error("🌞 > SEASON > [GET] Input validation error:", error)
        throw createError({
            statusCode: 400,
            message: 'Invalid input data',
            cause: error
        })
    }

    // Database operations try-catch - separate concerns
    try {
        console.info("🌞 > SEASON > [GET] Fetching season with id:", id)
        const season = await fetchSeason(d1Client, id)

        if (!season) {
            throw createError({
                statusCode: 404,
                message: `Season with id ${id} not found`
            })
        }

        console.info(`🌞 > SEASON > Returning season ${season.shortName}`)
        setResponseStatus(event, 200)
        return season
    } catch (error) {
        throwH3Error(`🌞 > SEASON > [GET] Error fetching season with id ${id}`, error)
    }
})
