import {createError, defineEventHandler, getValidatedRouterParams, setResponseStatus} from "h3"
import {fetchAllergy} from "~~/server/data/allergyRepository"
import type {AllergyDetail} from "~/composables/useAllergyValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {idParams} from '~/composables/useCoreValidation'

const {throwH3Error} = eventHandlerHelper

// Define schema for ID parameter
const paramSchema = idParams('id')

export default defineEventHandler(async (event): Promise<AllergyDetail> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Validate input - fail early on invalid data
    let allergyId!: number
    try {
        const {id} = await getValidatedRouterParams(event, paramSchema.parse)
        allergyId = id
    } catch (error) {
        return throwH3Error('🏥 > ALLERGY > [GET] Input validation error', error)
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
        return throwH3Error(`🏥 > ALLERGY > [GET] Error fetching allergy with ID ${allergyId}`, error)
    }
})
