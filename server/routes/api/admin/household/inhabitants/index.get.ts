// GET /api/admin/household/inhabitants - Get all inhabitants

import {defineEventHandler} from "h3"
import {fetchInhabitants} from "~~/server/data/prismaRepository"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {h3eFromCatch} = eventHandlerHelper

export default defineEventHandler(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    try {
        console.info("👩‍🏠 > INHABITANT > [GET] Fetching all inhabitants")
        const inhabitants = await fetchInhabitants(d1Client)
        console.info(`👩‍🏠 > INHABITANT > [GET] Successfully fetched ${inhabitants.length} inhabitants`)
        return inhabitants
    } catch (error) {
        const h3e = h3eFromCatch('👩‍🏠 > INHABITANT > [GET] Error fetching inhabitants', error)
        console.error(`👩‍🏠 > INHABITANT > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
})
