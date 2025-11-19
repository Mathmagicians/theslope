import {createError, defineEventHandler, setResponseStatus} from "h3"
import {fetchActiveSeasonId} from "~~/server/data/prismaRepository"

export default defineEventHandler(async (event): Promise<number | null> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    try {
        const activeSeasonId = await fetchActiveSeasonId(d1Client)
        console.info(`📆 > SEASON > ACTIVE > GET > Returning active season ID: ${activeSeasonId}`)
        setResponseStatus(event, 200)
        return activeSeasonId
    } catch (error) {
        console.error('📆 > SEASON > ACTIVE > GET > Error fetching active season ID:', error)
        throw createError({
            statusCode: 500,
            message: 'Failed to fetch active season ID',
            cause: error
        })
    }
})
