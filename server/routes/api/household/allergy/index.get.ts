import {defineEventHandler, getValidatedQuery, setResponseStatus} from "h3"
import {fetchAllergiesForInhabitant, fetchAllergiesForHousehold} from "~~/server/data/allergyRepository"
import type {AllergyDetail} from "~/composables/useAllergyValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {z} from 'zod'

const {throwH3Error} = eventHandlerHelper

// Define schema for query parameters
const querySchema = z.object({
    householdId: z.coerce.number().int().positive().optional(),
    inhabitantId: z.coerce.number().int().positive().optional()
}).refine(
    (data) => data.householdId || data.inhabitantId,
    { message: 'Either householdId or inhabitantId query parameter is required' }
).refine(
    (data) => !(data.householdId && data.inhabitantId),
    { message: 'Only one of householdId or inhabitantId query parameter can be provided, not both' }
)

export default defineEventHandler(async (event): Promise<AllergyDetail[]> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Validate input - fail early on invalid data
    let householdId: number | undefined
    let inhabitantId: number | undefined
    try {
        const query = await getValidatedQuery(event, querySchema.parse)
        householdId = query.householdId
        inhabitantId = query.inhabitantId
    } catch (error) {
        return throwH3Error('🏥 > ALLERGY > [GET] Input validation error', error)
    }


    // Fetch allergies from database
    try {
        // If inhabitantId query parameter is provided, fetch allergies for that inhabitant
        if (inhabitantId) {
            console.info(`🏥 > ALLERGY > [GET] Fetching allergies for inhabitant ${inhabitantId}`)
            const allergies = await fetchAllergiesForInhabitant(d1Client, inhabitantId)
            console.info(`🏥 > ALLERGY > [GET] Found ${allergies.length} allergies for inhabitant ${inhabitantId}`)
            setResponseStatus(event, 200)
            return allergies
        } else if (householdId) {
            console.info(`🏥 > ALLERGY > [GET] Fetching allergies for household ${householdId}`)
            const allergies = await fetchAllergiesForHousehold(d1Client, householdId)
            console.info(`🏥 > ALLERGY > [GET] Found ${allergies.length} allergies for household ${householdId}`)
            setResponseStatus(event, 200)
            return allergies
        } else {
            setResponseStatus(event, 200)
            return []
        }
    } catch (error) {
        return throwH3Error('🏥 > ALLERGY > [GET] Error fetching allergies', error)
    }

})
