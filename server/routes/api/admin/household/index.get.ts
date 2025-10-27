// GET /api/admin/household - List all households
// Returns HouseholdSummary[] (lightweight list with InhabitantDisplay)

import {defineEventHandler} from "h3"
import {fetchHouseholds} from "~~/server/data/prismaRepository"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import type {HouseholdSummary} from "~/composables/useHouseholdValidation"

const {h3eFromCatch} = eventHandlerHelper

export default defineEventHandler<Promise<HouseholdSummary[]>>(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    try {
        console.info("🏠 > HOUSEHOLD > [GET] Fetching all households")
        const households = await fetchHouseholds(d1Client)
        console.info("🏠 > HOUSEHOLD > [GET] Returning households", "count", households?.length || 0)
        return households ?? []
    } catch (error) {
        const h3e = h3eFromCatch('Error fetching households', error)
        console.error(`🏠 > HOUSEHOLD > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
})
