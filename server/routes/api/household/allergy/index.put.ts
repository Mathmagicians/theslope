import {defineEventHandler, readValidatedBody, setResponseStatus} from "h3"
import {createAllergy} from "~~/server/data/prismaRepository"
import {useAllergyValidation, type AllergyWithRelations} from "~/composables/useAllergyValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {AllergyCreateSchema} = useAllergyValidation()
const {h3eFromCatch} = eventHandlerHelper

export default defineEventHandler(async (event): Promise<AllergyWithRelations> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Validate input - fail early on invalid data
    let allergyData
    try {
        allergyData = await readValidatedBody(event, AllergyCreateSchema.parse)
    } catch (error) {
        const h3e = h3eFromCatch('🏥 > ALLERGY > [PUT] Input validation error', error)
        console.error(`🏥 > ALLERGY > [PUT] ${h3e.statusMessage}`, error)
        throw h3e
    }

    // Create allergy in database
    try {
        console.info(`🏥 > ALLERGY > [PUT] Creating allergy for inhabitant ${allergyData.inhabitantId}`)
        const newAllergy = await createAllergy(d1Client, allergyData)
        console.info(`🏥 > ALLERGY > [PUT] Created allergy with ID ${newAllergy.id}`)
        setResponseStatus(event, 201)
        return newAllergy
    } catch (error) {
        const h3e = h3eFromCatch(`🏥 > ALLERGY > [PUT] Error creating allergy for inhabitant ${allergyData.inhabitantId}`, error)
        console.error(`🏥 > ALLERGY > [PUT] ${h3e.statusMessage}`, error)
        throw h3e
    }
})
