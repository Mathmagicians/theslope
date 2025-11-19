import {defineEventHandler, setResponseStatus} from "h3"
import {fetchAllergyTypes} from "~~/server/data/allergyRepository"
import type {AllergyTypeDetail} from "~/composables/useAllergyValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {throwH3Error} = eventHandlerHelper

export default defineEventHandler(async (event): Promise<AllergyTypeDetail[]> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    try {
        console.info("🏥 > ALLERGY_TYPE > [GET] Fetching all allergy types")
        const allergyTypes = await fetchAllergyTypes(d1Client)
        console.info(`🏥 > ALLERGY_TYPE > [GET] Successfully fetched ${allergyTypes.length} allergy types`)
        setResponseStatus(event, 200)
        return allergyTypes
    } catch (error) {
        return throwH3Error("🏥 > ALLERGY_TYPE > [GET] Error fetching allergy types", error)
    }
})
