import {defineEventHandler, H3Error} from "h3"
import z from 'zod'
import {fetchCurrentSeason, fetchSeason} from "~/server/data/prismaRepository";

const seasonQuerySchema = z.object({
    start: z.string().date().optional(),
    end: z.string().date().optional()
})


// Will return the active season, if query parameter is not provided, or the requested season if query parameter is provided
export default defineEventHandler(async (event) => {
    try {
        const seasonQuery = await getValidatedQuery(event, seasonQuerySchema.parse)
        const {cloudflare} = event.context
        const d1Client = cloudflare.env.DB
        console.log("👨‍💻 > SEASON > query received", getQuery(event))
        const season = seasonQuery && seasonQuery.start && seasonQuery.end ? await fetchSeason(d1Client, seasonQuery.start, seasonQuery.end):  await fetchCurrentSeason(d1Client)
        console.info(`👨‍💻 > SEASON > Returning season ${season?.shortName}`)
        return season
    } catch (error) {
        console.error("👨‍💻 > SEASON > Error getting season: ", error)
        if (error instanceof H3Error) {
            console.error("👨‍💻 > SEASON > ZodError: ", error)
            throw createError({
                statusCode: 400,
                message: 'Forkert brugerinput',
                cause: error
            })
        }
        throw createError({
            statusCode: 500,
            message: '👨‍💻> SEASON > Server Error',
            cause: error
        })
    }
})
