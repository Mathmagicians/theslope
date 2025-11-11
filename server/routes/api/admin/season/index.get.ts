import {fetchSeasons} from "~~/server/data/prismaRepository"
import type {Season} from "~/composables/useSeasonValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {h3eFromCatch} = eventHandlerHelper

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
        const h3e = h3eFromCatch("🌞 > SEASON > [GET] Error fetching seasons", error)
        console.error(`🌞 > SEASON > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
})
