import {defineEventHandler, H3Error} from "h3"
import {fetchSeasons} from "~~/server/data/prismaRepository";

export default defineEventHandler(async (event) => {
    try {
        const {cloudflare} = event.context
        const d1Client = cloudflare.env.DB
        console.log("👨‍💻 > SEASON > [GET]")
        const seasons = await fetchSeasons(d1Client)
        console.info(`👨‍💻 > SEASON > Returning seasons ${seasons?.length}`)
        return seasons ? seasons : []
    } catch (error) {
        console.error("👨‍💻 > SEASON > Error getting seasons: ", error)
        throw createError({
            statusCode: 500,
            message: '👨‍💻> SEASON > Server Error',
            cause: error
        })
    }
})
