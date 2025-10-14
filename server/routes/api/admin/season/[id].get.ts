import {defineEventHandler, createError, getValidatedRouterParams} from "h3";
import {fetchSeason} from "~~/server/data/prismaRepository"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import z from "zod"

const {h3eFromCatch} = eventHandlerHelper

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

        if (!season) {
            throw createError({
                statusCode: 404,
                message: `Season with id ${id} not found`
            })
        }

        console.info(`🌞 > SEASON > Returning season ${season.shortName}`)
        return season
    } catch (error) {
        const h3e = h3eFromCatch(`🌞 > SEASON > [GET] Error fetching season with id ${id}`, error)
        console.error(`🌞 > SEASON > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
})
