import {defineEventHandler, getValidatedRouterParams, readBody} from "h3"
import {updateAllergyType} from "~~/server/data/prismaRepository"
import {useAllergyValidation, type AllergyTypeUpdate} from "~/composables/useAllergyValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import * as z from 'zod'

const {AllergyTypeUpdateSchema} = useAllergyValidation()
const {h3eFromCatch} = eventHandlerHelper

// Define schema for ID parameter
const idSchema = z.object({
    id: z.coerce.number().int().positive('Allergy type ID must be a positive integer')
})

export default defineEventHandler(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    console.info("🏥 > ALLERGY_TYPE > [POST] Processing allergy type update request")

    // Validate input - fail early on invalid data
    let allergyTypeId: number
    let allergyTypeData: AllergyTypeUpdate
    try {
        const {id} = await getValidatedRouterParams(event, idSchema.parse)
        allergyTypeId = id

        const body = await readBody(event)
        allergyTypeData = AllergyTypeUpdateSchema.parse({...body, id: allergyTypeId})
    } catch (error) {
        const h3e = h3eFromCatch('🏥 > ALLERGY_TYPE > [POST] Input validation error', error)
        console.error(`🏥 > ALLERGY_TYPE > [POST] ${h3e.statusMessage}`, error)
        throw h3e
    }

    // Update allergy type in database
    try {
        console.info(`🏥 > ALLERGY_TYPE > [POST] Updating allergy type with ID ${allergyTypeId}`)
        const updatedAllergyType = await updateAllergyType(d1Client, allergyTypeData)
        console.info(`🏥 > ALLERGY_TYPE > [POST] Updated allergy type ${updatedAllergyType.name}`)
        return updatedAllergyType
    } catch (error) {
        const h3e = h3eFromCatch(`🏥 > ALLERGY_TYPE > [POST] Error updating allergy type with ID ${allergyTypeId}`, error)
        console.error(`🏥 > ALLERGY_TYPE > [POST] ${h3e.statusMessage}`, error)
        throw h3e
    }
})
