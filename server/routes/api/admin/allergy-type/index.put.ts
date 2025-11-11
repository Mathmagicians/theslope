import {defineEventHandler} from "h3"
import {createAllergyType} from "~~/server/data/prismaRepository"
import {useAllergyValidation} from "~/composables/useAllergyValidation"
import type {AllergyTypeResponse} from "~/composables/useAllergyValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {h3eFromCatch} = eventHandlerHelper

export default defineEventHandler(async (event): Promise<AllergyTypeResponse> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    const {AllergyTypeCreateSchema} = useAllergyValidation()

    // Input validation - FAIL EARLY
    let requestData
    try {
        requestData = await readValidatedBody(event, AllergyTypeCreateSchema.parse)
    } catch (error) {
        const h3e = h3eFromCatch('🏥 > ALLERGY_TYPE > [PUT] Input validation error', error)
        console.error(`🏥 > ALLERGY_TYPE > [PUT] ${h3e.statusMessage}`, error)
        throw h3e
    }

    // Business logic
    try {
        console.info(`🏥 > ALLERGY_TYPE > [PUT] Creating allergy type ${requestData.name}`)
        const newAllergyType = await createAllergyType(d1Client, requestData)
        console.info(`🏥 > ALLERGY_TYPE > [PUT] Successfully created allergy type ${newAllergyType.name} with ID ${newAllergyType.id}`)
        setResponseStatus(event, 201)
        return newAllergyType
    } catch (error) {
        const h3e = h3eFromCatch(`🏥 > ALLERGY_TYPE > [PUT] Error creating allergy type`, error)
        console.error(`🏥 > ALLERGY_TYPE > [PUT] ${h3e.statusMessage}`, error)
        throw h3e
    }
})
