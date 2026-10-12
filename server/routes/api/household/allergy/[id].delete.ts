import {defineEventHandler, getValidatedRouterParams, setResponseStatus} from "h3"
import {deleteAllergy} from "~~/server/data/allergyRepository"
import type {AllergyDisplay} from "~/composables/useAllergyValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {idParams} from '~/composables/useCoreValidation'

const {throwH3Error} = eventHandlerHelper

// Define schema for ID parameter
const paramSchema = idParams('id')

export default defineEventHandler(async (event): Promise<AllergyDisplay> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Validate input - fail early on invalid data
    let allergyId!: number
    try {
        const {id} = await getValidatedRouterParams(event, paramSchema.parse)
        allergyId = id
    } catch (error) {
        return throwH3Error('🏥 > ALLERGY > [DELETE] Input validation error', error)
    }

    // Delete allergy from database
    try {
        console.info(`🏥 > ALLERGY > [DELETE] Deleting allergy with ID ${allergyId}`)
        const deletedAllergy = await deleteAllergy(d1Client, allergyId)
        console.info(`🏥 > ALLERGY > [DELETE] Deleted allergy with ID ${deletedAllergy.id}`)
        setResponseStatus(event, 200)
        return deletedAllergy
    } catch (error) {
        return throwH3Error(`🏥 > ALLERGY > [DELETE] Error deleting allergy with ID ${allergyId}`, error)
    }
})
