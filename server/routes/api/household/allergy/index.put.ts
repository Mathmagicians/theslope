import {defineEventHandler, readValidatedBody, setResponseStatus} from "h3"
import {createAllergy} from "~~/server/data/allergyRepository"
import {useAllergyValidation, type AllergyDetail, type AllergyCreate} from "~/composables/useAllergyValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {AllergyCreateSchema} = useAllergyValidation()
const {throwH3Error} = eventHandlerHelper

export default defineEventHandler(async (event): Promise<AllergyDetail> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Validate input - fail early on invalid data
    let allergyData!: AllergyCreate
    try {
        allergyData = await readValidatedBody(event, AllergyCreateSchema.parse)
    } catch (error) {
        throwH3Error('🏥 > ALLERGY > [PUT] Input validation error', error)
        return undefined as never
    }

    // Create allergy in database
    try {
        console.info(`🏥 > ALLERGY > [PUT] Creating allergy for inhabitant ${allergyData.inhabitantId}`)
        const newAllergy = await createAllergy(d1Client, allergyData)
        console.info(`🏥 > ALLERGY > [PUT] Created allergy with ID ${newAllergy.id}`)
        setResponseStatus(event, 201)
        return newAllergy
    } catch (error) {
        throwH3Error(`🏥 > ALLERGY > [PUT] Error creating allergy for inhabitant ${allergyData.inhabitantId}`, error)
        return undefined as never
    }
})
