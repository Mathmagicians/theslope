import {defineEventHandler, getValidatedRouterParams, readBody} from "h3"
import {updateAllergy} from "~~/server/data/prismaRepository"
import {useAllergyValidation, type AllergyUpdate} from "~/composables/useAllergyValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import * as z from 'zod'

const {AllergyUpdateSchema} = useAllergyValidation()
const {h3eFromCatch} = eventHandlerHelper

// Define schema for ID parameter
const idSchema = z.object({
    id: z.coerce.number().int().positive('Allergy ID must be a positive integer')
})

export default defineEventHandler(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    console.info("🏥 > ALLERGY > [POST] Processing allergy update request")

    // Validate input - fail early on invalid data
    let allergyId: number
    let allergyData: AllergyUpdate
    try {
        const {id} = await getValidatedRouterParams(event, idSchema.parse)
        allergyId = id

        const body = await readBody(event)
        allergyData = AllergyUpdateSchema.parse({...body, id: allergyId})
    } catch (error) {
        const h3e = h3eFromCatch('🏥 > ALLERGY > [POST] Input validation error', error)
        console.error(`🏥 > ALLERGY > [POST] ${h3e.statusMessage}`, error)
        throw h3e
    }

    // Update allergy in database
    try {
        console.info(`🏥 > ALLERGY > [POST] Updating allergy with ID ${allergyId}`)
        const updatedAllergy = await updateAllergy(d1Client, allergyData)
        console.info(`🏥 > ALLERGY > [POST] Updated allergy with ID ${updatedAllergy.id}`)
        return updatedAllergy
    } catch (error) {
        const h3e = h3eFromCatch(`🏥 > ALLERGY > [POST] Error updating allergy with ID ${allergyId}`, error)
        console.error(`🏥 > ALLERGY > [POST] ${h3e.statusMessage}`, error)
        throw h3e
    }
})
