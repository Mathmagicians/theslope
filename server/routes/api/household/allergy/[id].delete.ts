import {defineEventHandler, getValidatedRouterParams} from "h3"
import {deleteAllergy} from "~~/server/data/prismaRepository"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import * as z from 'zod'

const {h3eFromCatch} = eventHandlerHelper

// Define schema for ID parameter
const idSchema = z.object({
    id: z.coerce.number().int().positive('Allergy ID must be a positive integer')
})

export default defineEventHandler(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Validate input - fail early on invalid data
    let allergyId: number
    try {
        const {id} = await getValidatedRouterParams(event, idSchema.parse)
        allergyId = id
    } catch (error) {
        const h3e = h3eFromCatch('🏥 > ALLERGY > [DELETE] Input validation error', error)
        console.error(`🏥 > ALLERGY > [DELETE] ${h3e.statusMessage}`, error)
        throw h3e
    }

    // Delete allergy from database
    try {
        console.info(`🏥 > ALLERGY > [DELETE] Deleting allergy with ID ${allergyId}`)
        const deletedAllergy = await deleteAllergy(d1Client, allergyId)
        console.info(`🏥 > ALLERGY > [DELETE] Deleted allergy with ID ${deletedAllergy.id}`)
        return deletedAllergy
    } catch (error) {
        const h3e = h3eFromCatch(`🏥 > ALLERGY > [DELETE] Error deleting allergy with ID ${allergyId}`, error)
        console.error(`🏥 > ALLERGY > [DELETE] ${h3e.statusMessage}`, error)
        throw h3e
    }
})
