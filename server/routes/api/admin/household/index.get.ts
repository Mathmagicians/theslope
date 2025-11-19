// GET /api/admin/household - List all households
// Returns HouseholdDisplay[] (lightweight list with basic inhabitant info) - ADR-009

import {defineEventHandler, setResponseStatus} from "h3"
import {fetchHouseholds} from "~~/server/data/prismaRepository"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import type {HouseholdDisplay} from "~/composables/useCoreValidation"

const {throwH3Error} = eventHandlerHelper

export default defineEventHandler<Promise<HouseholdDisplay[]>>(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    try {
        console.info("🏠 > HOUSEHOLD > [GET] Fetching all households")
        const households = await fetchHouseholds(d1Client)
        console.info("🏠 > HOUSEHOLD > [GET] Returning households", "count", households?.length || 0)
        setResponseStatus(event, 200)
        return households ?? []
    } catch (error) {
        throwH3Error('Error fetching households', error)
    }
})
