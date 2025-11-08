import {defineEventHandler} from "h3"
import {fetchAllergyTypes} from "~~/server/data/prismaRepository"
import type {AllergyTypeWithInhabitants} from "~/composables/useAllergyValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {h3eFromCatch} = eventHandlerHelper

export default defineEventHandler(async (event): Promise<AllergyTypeWithInhabitants[]> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    console.info("🏥 > ALLERGY_TYPE > [GET] Fetching all allergy types")

    try {
        const allergyTypes = await fetchAllergyTypes(d1Client)
        console.info("🏥 > ALLERGY_TYPE > [GET] Found allergy types:", allergyTypes.length)
        return allergyTypes
    } catch (error) {
        const h3e = h3eFromCatch("🏥 > ALLERGY_TYPE > [GET] Error fetching allergy types", error)
        console.error(`🏥 > ALLERGY_TYPE > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
})
