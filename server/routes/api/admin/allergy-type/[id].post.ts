import {defineEventHandler, getValidatedRouterParams, setResponseStatus} from "h3"
import {updateAllergyType} from "~~/server/data/prismaRepository"
import {useAllergyValidation} from "~/composables/useAllergyValidation"
import type {AllergyTypeResponse} from "~/composables/useAllergyValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import * as z from 'zod'

const {h3eFromCatch} = eventHandlerHelper

// Define schema for ID parameter
const idSchema = z.object({
    id: z.coerce.number().int().positive('Allergy type ID must be a positive integer')
})

export default defineEventHandler(async (event): Promise<AllergyTypeResponse> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    const {AllergyTypeUpdateSchema} = useAllergyValidation()

    // Input validation - FAIL EARLY
    let id: number
    let requestData
    try {
        const params = await getValidatedRouterParams(event, idSchema.parse)
        id = params.id
        requestData = await readValidatedBody(event, (body) => AllergyTypeUpdateSchema.parse({...body, id}))
    } catch (error) {
        const h3e = h3eFromCatch('🏥 > ALLERGY_TYPE > [POST] Input validation error', error)
        console.error(`🏥 > ALLERGY_TYPE > [POST] ${h3e.statusMessage}`, error)
        throw h3e
    }

    // Business logic
    try {
        console.info(`🏥 > ALLERGY_TYPE > [POST] Updating allergy type with ID ${id}`)
        const updatedAllergyType = await updateAllergyType(d1Client, requestData)
        console.info(`🏥 > ALLERGY_TYPE > [POST] Successfully updated allergy type ${updatedAllergyType.name}`)
        setResponseStatus(event, 200)
        return updatedAllergyType
    } catch (error) {
        const h3e = h3eFromCatch(`🏥 > ALLERGY_TYPE > [POST] Error updating allergy type with ID ${id}`, error)
        console.error(`🏥 > ALLERGY_TYPE > [POST] ${h3e.statusMessage}`, error)
        throw h3e
    }
})
