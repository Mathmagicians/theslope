import {defineEventHandler, getValidatedQuery, getValidatedRouterParams, setResponseStatus} from "h3"
import {deleteAllergy, fetchAllergy} from "~~/server/data/allergyRepository"
import type {AllergyDisplay} from "~/composables/useAllergyValidation"
import {canMutateAllergies} from '~/composables/usePermissions'
import {requireHouseholdAccess} from "~~/server/utils/authorizationHelper"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {AdminBypassQuerySchema, idParams} from '~/composables/useCoreValidation'

const {throwH3Error} = eventHandlerHelper

// Define schema for ID parameter
const paramSchema = idParams('id')

/**
 * DELETE /api/household/allergy/[id] - remove an inhabitant's allergy
 * Requires: authenticated user belongs to the allergy's household; with `?adminBypass=true` an admin or the allergy
 * manager removes any household's (ADR-004)
 */
export default defineEventHandler(async (event): Promise<AllergyDisplay> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Validate input - fail early on invalid data
    let allergyId!: number
    let adminBypass!: boolean
    try {
        const {id} = await getValidatedRouterParams(event, paramSchema.parse)
        allergyId = id
        adminBypass = (await getValidatedQuery(event, AdminBypassQuerySchema.parse)).adminBypass
    } catch (error) {
        return throwH3Error('🏥 > ALLERGY > [DELETE] Input validation error', error)
    }

    // Delete allergy from database
    try {
        const allergy = await fetchAllergy(d1Client, allergyId)
        if (!allergy) {
            return throwH3Error(`🏥 > ALLERGY > [DELETE] Allergy ${allergyId} not found`, new Error('Not found'), 404)
        }
        const user = await requireHouseholdAccess(event, allergy.inhabitant.householdId, adminBypass ? canMutateAllergies : undefined)

        console.info(`🏥 > ALLERGY > [DELETE] User ${user.email} deleting allergy with ID ${allergyId}`)
        const deletedAllergy = await deleteAllergy(d1Client, allergyId)
        console.info(`🏥 > ALLERGY > [DELETE] Deleted allergy with ID ${deletedAllergy.id}`)
        setResponseStatus(event, 200)
        return deletedAllergy
    } catch (error) {
        return throwH3Error(`🏥 > ALLERGY > [DELETE] Error deleting allergy with ID ${allergyId}`, error)
    }
})
