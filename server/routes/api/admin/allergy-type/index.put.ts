import {defineEventHandler, readValidatedBody, setResponseStatus} from "h3"
import {createAllergyType} from "~~/server/data/allergyRepository"
import {useAllergyValidation} from "~/composables/useAllergyValidation"
import type {AllergyTypeCreate, AllergyTypeDisplay} from "~/composables/useAllergyValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {throwH3Error} = eventHandlerHelper

export default defineEventHandler(async (event): Promise<AllergyTypeDisplay> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    const {AllergyTypeCreateSchema} = useAllergyValidation()

    // Input validation - FAIL EARLY
    let requestData!: AllergyTypeCreate
    try {
        requestData = await readValidatedBody(event, AllergyTypeCreateSchema.parse)
    } catch (error) {
        return throwH3Error('🏥 > ALLERGY_TYPE > [PUT] Input validation error', error)
    }

    // Business logic
    try {
        console.info(`🏥 > ALLERGY_TYPE > [PUT] Creating allergy type ${requestData.name}`)
        const newAllergyType = await createAllergyType(d1Client, requestData)
        console.info(`🏥 > ALLERGY_TYPE > [PUT] Successfully created allergy type ${newAllergyType.name} with ID ${newAllergyType.id}`)
        setResponseStatus(event, 201)
        return newAllergyType
    } catch (error) {
        return throwH3Error(`🏥 > ALLERGY_TYPE > [PUT] Error creating allergy type`, error)
    }
})
