import {defineEventHandler, createError, getQuery, getValidatedQuery} from "h3"
import z from 'zod'
import {fetchCurrentSeason, fetchSeasonForRange} from "~~/server/data/prismaRepository"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {h3eFromCatch} = eventHandlerHelper

const seasonQuerySchema = z.object({
    start: z.string().date().optional(),
    end: z.string().date().optional()
})


// Will return the active season, if query parameter is not provided, or the requested season if query parameter is provided
export default defineEventHandler(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    console.log("👨‍💻 > SEASON > query received", getQuery(event))

    // Validate query parameters - fail early on invalid data
    let seasonQuery
    try {
        seasonQuery = await getValidatedQuery(event, seasonQuerySchema.parse)
    } catch (error) {
        console.error("👨‍💻 > SEASON > Validation error: ", error)
        throw createError({
            statusCode: 400,
            message: 'Forkert brugerinput',
            cause: error
        })
    }

    // Fetch season from database
    try {
        const season = seasonQuery && seasonQuery.start && seasonQuery.end
            ? await fetchSeasonForRange(d1Client, seasonQuery.start, seasonQuery.end)
            : await fetchCurrentSeason(d1Client)
        console.info(`👨‍💻 > SEASON > Returning season ${season?.shortName}`)
        return season
    } catch (error) {
        const h3e = h3eFromCatch("👨‍💻 > SEASON > [GET] Error fetching active season", error)
        console.error(`👨‍💻 > SEASON > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
})
