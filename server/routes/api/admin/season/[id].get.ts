import {defineEventHandler, createError, getValidatedRouterParams} from "h3";
import {fetchSeason} from "~~/server/data/prismaRepository"
import z from "zod"

const idSchema = z.object({
    id: z.number({ coerce: true }).positive().int(),
});

export default defineEventHandler(async (event) => {
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
        console.info(`🌞 > SEASON > Returning season ${season?.shortName}`)
        return season
    } catch (error) {
        console.error("🌞 > SEASON > Error getting season:", error)
        throw createError({
            statusCode: 500,
            message: '🌞 > SEASON > Server Error',
            cause: error
        })
    }
})
