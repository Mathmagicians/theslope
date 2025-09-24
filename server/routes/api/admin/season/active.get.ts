import {defineEventHandler, createError, getQuery, getValidatedQuery} from "h3"
import z from 'zod'
import {fetchCurrentSeason, fetchSeasonForRange} from "~~/server/data/prismaRepository";

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
        console.error("👨‍💻 > SEASON > Error getting season: ", error)
        throw createError({
            statusCode: 500,
            message: '👨‍💻 > SEASON > Server Error',
            cause: error
        })
    }
})
