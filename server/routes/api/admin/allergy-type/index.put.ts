import {defineEventHandler, readBody, setResponseStatus} from "h3"
import {createAllergyType} from "~~/server/data/prismaRepository"
import {useAllergyValidation, type AllergyTypeCreate} from "~/composables/useAllergyValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {AllergyTypeCreateSchema} = useAllergyValidation()
const {h3eFromCatch} = eventHandlerHelper

export default defineEventHandler(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    console.info("🏥 > ALLERGY_TYPE > [PUT] Processing allergy type creation request")

    // Validate input - fail early on invalid data
    let allergyTypeData: AllergyTypeCreate
    try {
        const body = await readBody(event)
        allergyTypeData = AllergyTypeCreateSchema.parse(body)
    } catch (error) {
        const h3e = h3eFromCatch('🏥 > ALLERGY_TYPE > [PUT] Input validation error', error)
        console.error(`🏥 > ALLERGY_TYPE > [PUT] ${h3e.statusMessage}`, error)
        throw h3e
    }

    // Create allergy type in database
    try {
        console.info(`🏥 > ALLERGY_TYPE > [PUT] Creating allergy type ${allergyTypeData.name}`)
        const newAllergyType = await createAllergyType(d1Client, allergyTypeData)
        console.info(`🏥 > ALLERGY_TYPE > [PUT] Created allergy type ${newAllergyType.name} with ID ${newAllergyType.id}`)
        setResponseStatus(event, 201)
        return newAllergyType
    } catch (error) {
        const h3e = h3eFromCatch(`🏥 > ALLERGY_TYPE > [PUT] Error creating allergy type ${allergyTypeData.name}`, error)
        console.error(`🏥 > ALLERGY_TYPE > [PUT] ${h3e.statusMessage}`, error)
        throw h3e
    }
})
