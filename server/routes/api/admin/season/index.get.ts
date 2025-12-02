import {defineEventHandler, setResponseStatus} from "h3"
import {fetchSeasons} from "~~/server/data/prismaRepository"
import type {Season} from "~/composables/useSeasonValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {throwH3Error} = eventHandlerHelper

export default defineEventHandler(async (event): Promise<Season[]> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    try {
        console.info("🌞 > SEASON > [GET] Fetching all seasons")
        const seasons = await fetchSeasons(d1Client)
        console.info(`🌞 > SEASON > [GET] Returning ${seasons?.length} seasons`)
        setResponseStatus(event, 200)
        return seasons ? seasons : []
    } catch (error) {
        return throwH3Error("🌞 > SEASON > [GET] Error fetching seasons", error)
    }
})
