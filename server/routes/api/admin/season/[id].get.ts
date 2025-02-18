import {defineEventHandler} from "h3";
import {fetchSeason} from "~/server/data/prismaRepository"
import z from "zod"

const idSchema = z.object({
    id: z.number({ coerce: true }).positive().int(),
});

export default defineEventHandler(async (event) => {
    try {
        const id: number = getValidatedRouterParam(event, idSchema.parse) as number
        console.info("👨‍💻> SEASON > [GET] >  id/", id)

        const {cloudflare} = event.context
        const d1Client = cloudflare.env.DB

        const season = await fetchSeason(d1Client, id)
        console.info(`👨‍💻 > SEASON > Returning season ${season?.shortName}`)
        return season
    } catch (error) {
        console.error("👨‍💻 > SEASON > Error getting season: ", error)
        if (e instanceof z.ZodError && e.format()?.id) {
            throw createError({
                statusCode: 400,
                statusMessage: "Invalid season id: " + z.ZodError && e.format()?.id
            })
        }
        throw createError({
            statusCode: 500,
            message: '👨‍💻> SEASON > Server Error',
            cause: error
        })
    }
})
