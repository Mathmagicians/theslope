import {defineEventHandler, getValidatedRouterParams, setResponseStatus} from "h3"
import {deleteAllergyType} from "~~/server/data/prismaRepository"
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

    // Input validation - FAIL EARLY
    let id: number
    try {
        const params = await getValidatedRouterParams(event, idSchema.parse)
        id = params.id
    } catch (error) {
        const h3e = h3eFromCatch('🏥 > ALLERGY_TYPE > [DELETE] Input validation error', error)
        console.error(`🏥 > ALLERGY_TYPE > [DELETE] ${h3e.statusMessage}`, error)
        throw h3e
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
        const h3e = h3eFromCatch(`🏥 > ALLERGY_TYPE > [DELETE] Error deleting allergy type with ID ${id}`, error)
        console.error(`🏥 > ALLERGY_TYPE > [DELETE] ${h3e.statusMessage}`, error)
        throw h3e
    }
})
