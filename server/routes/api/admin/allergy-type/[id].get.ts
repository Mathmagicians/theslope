import {defineEventHandler, getValidatedRouterParams, setResponseStatus} from "h3"
import {fetchAllergyType} from "~~/server/data/allergyRepository"
import type {AllergyTypeDisplay} from "~/composables/useAllergyValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {idParams} from '~/composables/useCoreValidation'

const {throwH3Error} = eventHandlerHelper

// Define schema for ID parameter
const paramSchema = idParams('id')

export default defineEventHandler(async (event): Promise<AllergyTypeDisplay> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Validate input - fail early on invalid data
    let allergyTypeId!: number
    try {
        const {id} = await getValidatedRouterParams(event, paramSchema.parse)
        allergyTypeId = id
    } catch (error) {
        return throwH3Error('🏥 > ALLERGY_TYPE > [GET] Input validation error', error)
    }

    // Business logic
    try {
        console.info(`🏥 > ALLERGY_TYPE > [GET] Fetching allergy type with ID ${allergyTypeId}`)
        const allergyType = await fetchAllergyType(d1Client, allergyTypeId)

        if (!allergyType) {
            throw createError({
                statusCode: 404,
                message: `Allergy type with ID ${allergyTypeId} not found`
            })
        }

        console.info(`🏥 > ALLERGY_TYPE > [GET] Successfully fetched allergy type ${allergyType.name}`)
        setResponseStatus(event, 200)
        return allergyType
    } catch (error) {
        return throwH3Error(`🏥 > ALLERGY_TYPE > [GET] Error fetching allergy type with ID ${allergyTypeId}`, error)
    }
})
