import {defineEventHandler, getValidatedRouterParams} from "h3"
import {fetchAllergyType} from "~~/server/data/prismaRepository"
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

    // Validate input - fail early on invalid data
    let allergyTypeId: number
    try {
        const {id} = await getValidatedRouterParams(event, idSchema.parse)
        allergyTypeId = id
    } catch (error) {
        const h3e = h3eFromCatch('🏥 > ALLERGY_TYPE > [GET] Input validation error', error)
        console.error(`🏥 > ALLERGY_TYPE > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }

    // Fetch allergy type from database
    try {
        console.info(`🏥 > ALLERGY_TYPE > [GET] Fetching allergy type with ID ${allergyTypeId}`)
        const allergyType = await fetchAllergyType(d1Client, allergyTypeId)

        if (!allergyType) {
            throw createError({
                statusCode: 404,
                message: `Allergy type with ID ${allergyTypeId} not found`
            })
        }

        console.info(`🏥 > ALLERGY_TYPE > [GET] Found allergy type ${allergyType.name}`)
        return allergyType
    } catch (error) {
        const h3e = h3eFromCatch(`🏥 > ALLERGY_TYPE > [GET] Error fetching allergy type with ID ${allergyTypeId}`, error)
        console.error(`🏥 > ALLERGY_TYPE > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
})
