import {defineEventHandler, getValidatedRouterParams, setResponseStatus} from "h3"
import type {AllergyTypeDisplay} from "~/composables/useAllergyValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {idParams} from '~/composables/useCoreValidation'
import {deleteAllergyType} from "~~/server/data/allergyRepository"

const {throwH3Error} = eventHandlerHelper

// Define schema for ID parameter
const paramSchema = idParams('id')

export default defineEventHandler(async (event): Promise<AllergyTypeDisplay> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation - FAIL EARLY
    let id!: number
    try {
        const params = await getValidatedRouterParams(event, paramSchema.parse)
        id = params.id
    } catch (error) {
        return throwH3Error('🏥 > ALLERGY_TYPE > [DELETE] Input validation error', error)
    }

    // Business logic
    // ADR-005: Single atomic delete - Prisma handles CASCADE deletion of related allergies
    try {
        console.info(`🏥 > ALLERGY_TYPE > [DELETE] Deleting allergy type with ID ${id}`)
        const deletedAllergyType = await deleteAllergyType(d1Client, id)
        console.info(`🏥 > ALLERGY_TYPE > [DELETE] Successfully deleted allergy type ${deletedAllergyType.name}`)
        setResponseStatus(event, 200)
        return deletedAllergyType
    } catch (error) {
        return throwH3Error(`🏥 > ALLERGY_TYPE > [DELETE] Error deleting allergy type with ID ${id}`, error)
    }
})
