// GET /api/admin/household/inhabitants - Get all inhabitants

import {defineEventHandler, setResponseStatus} from "h3"
import {fetchInhabitants} from "~~/server/data/prismaRepository"
import type {InhabitantDetail} from "~/composables/useCoreValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {throwH3Error} = eventHandlerHelper

export default defineEventHandler<Promise<InhabitantDetail[]>>(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    try {
        console.info("👩‍🏠 > INHABITANT > [GET] Fetching all inhabitants")
        const inhabitants = await fetchInhabitants(d1Client)
        console.info(`👩‍🏠 > INHABITANT > [GET] Successfully fetched ${inhabitants.length} inhabitants`)
        setResponseStatus(event, 200)
        return inhabitants
    } catch (error) {
        return throwH3Error('👩‍🏠 > INHABITANT > [GET] Error fetching inhabitants', error)
    }
})

