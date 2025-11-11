import {defineEventHandler, getValidatedRouterParams, setResponseStatus} from "h3"
import {fetchAllergy} from "~~/server/data/prismaRepository"
import {type AllergyWithRelations} from "~/composables/useAllergyValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import * as z from 'zod'

const {h3eFromCatch} = eventHandlerHelper

// Define schema for ID parameter
const idSchema = z.object({
    id: z.coerce.number().int().positive('Allergy ID must be a positive integer')
})

export default defineEventHandler(async (event): Promise<AllergyWithRelations> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Validate input - fail early on invalid data
    let allergyId: number
    try {
        const {id} = await getValidatedRouterParams(event, idSchema.parse)
        allergyId = id
    } catch (error) {
        const h3e = h3eFromCatch('🏥 > ALLERGY > [GET] Input validation error', error)
        console.error(`🏥 > ALLERGY > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }

    // Fetch allergy from database
    try {
        console.info(`🏥 > ALLERGY > [GET] Fetching allergy with ID ${allergyId}`)
        const allergy = await fetchAllergy(d1Client, allergyId)

        if (!allergy) {
            throw createError({
                statusCode: 404,
                message: `Allergy with ID ${allergyId} not found`
            })
        }

        console.info(`🏥 > ALLERGY > [GET] Found allergy with ID ${allergyId}`)
        setResponseStatus(event, 200)
        return allergy
    } catch (error) {
        const h3e = h3eFromCatch(`🏥 > ALLERGY > [GET] Error fetching allergy with ID ${allergyId}`, error)
        console.error(`🏥 > ALLERGY > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
})
