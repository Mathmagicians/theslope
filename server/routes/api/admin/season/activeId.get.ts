import {fetchSeasons} from "~~/server/data/prismaRepository"

export default defineEventHandler(async (event): Promise<number | null> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    try {
        const seasons = await fetchSeasons(d1Client)
        const activeSeasonId = seasons[0]?.id ?? null
        // FIXME should be changed to real implementation
        console.info(`📆 > SEASON_ACTIVE_ID > Returning active season ID: ${activeSeasonId}`)
        setResponseStatus(event, 200)
        return activeSeasonId
    } catch (error) {
        console.error('📆 > SEASON_ACTIVE_ID > Error fetching active season ID:', error)
        throw createError({
            statusCode: 500,
            message: 'Failed to fetch active season ID',
            cause: error
        })
    }
})
