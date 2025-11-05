import {defineEventHandler, getValidatedRouterParams} from "h3"
import {deleteAllergyType} from "~~/server/data/prismaRepository"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import * as z from 'zod'

const {h3eFromCatch} = eventHandlerHelper

// Define schema for ID parameter
const idSchema = z.object({
    id: z.coerce.number().int().positive('Allergy type ID must be a positive integer')
})

export default defineEventHandler(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Validate input - fail early on invalid data
    let allergyTypeId: number
    try {
        const {id} = await getValidatedRouterParams(event, idSchema.parse)
        allergyTypeId = id
    } catch (error) {
        const h3e = h3eFromCatch('🏥 > ALLERGY_TYPE > [DELETE] Input validation error', error)
        console.error(`🏥 > ALLERGY_TYPE > [DELETE] ${h3e.statusMessage}`, error)
        throw h3e
    }

    // Delete allergy type from database
    // ADR-005: Single atomic delete - Prisma handles CASCADE deletion of related allergies
    try {
        console.info(`🏥 > ALLERGY_TYPE > [DELETE] Deleting allergy type with ID ${allergyTypeId}`)
        const deletedAllergyType = await deleteAllergyType(d1Client, allergyTypeId)
        console.info(`🏥 > ALLERGY_TYPE > [DELETE] Deleted allergy type ${deletedAllergyType.name}`)
        return deletedAllergyType
    } catch (error) {
        const h3e = h3eFromCatch(`🏥 > ALLERGY_TYPE > [DELETE] Error deleting allergy type with ID ${allergyTypeId}`, error)
        console.error(`🏥 > ALLERGY_TYPE > [DELETE] ${h3e.statusMessage}`, error)
        throw h3e
    }
})
