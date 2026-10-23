import {defineEventHandler, getValidatedQuery, getValidatedRouterParams, readValidatedBody, setResponseStatus} from "h3"
import {fetchAllergy, updateAllergy} from "~~/server/data/allergyRepository"
import {useAllergyValidation, type AllergyDetail, type AllergyUpdate} from "~/composables/useAllergyValidation"
import {canMutateAllergies} from '~/composables/usePermissions'
import {requireHouseholdAccess} from "~~/server/utils/authorizationHelper"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {z} from 'zod'
import {AdminBypassQuerySchema, idParams} from '~/composables/useCoreValidation'

const {throwH3Error} = eventHandlerHelper

// Define schema for ID parameter
const paramSchema = idParams('id')

/**
 * POST /api/household/allergy/[id] - update an inhabitant's allergy
 * Requires: authenticated user belongs to the allergy's household; with `?adminBypass=true` an admin or the allergy
 * manager updates any household's (ADR-004)
 */
export default defineEventHandler(async (event): Promise<AllergyDetail> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    const {AllergyUpdateSchema} = useAllergyValidation()

    // Validate input - fail early on invalid data
    let allergyId!: number
    let allergyData!: AllergyUpdate
    let adminBypass!: boolean
    try {
        const {id} = await getValidatedRouterParams(event, paramSchema.parse)
        allergyId = id

        const body = await readValidatedBody(event, z.looseObject({}).parse)
        allergyData = AllergyUpdateSchema.parse({...body, id: allergyId})
        adminBypass = (await getValidatedQuery(event, AdminBypassQuerySchema.parse)).adminBypass
    } catch (error) {
        return throwH3Error('🏥 > ALLERGY > [POST] Input validation error', error)
    }

    // Update allergy in database
    try {
        const allergy = await fetchAllergy(d1Client, allergyId)
        if (!allergy) {
            return throwH3Error(`🏥 > ALLERGY > [POST] Allergy ${allergyId} not found`, new Error('Not found'), 404)
        }
        const user = await requireHouseholdAccess(event, allergy.inhabitant.householdId, adminBypass ? canMutateAllergies : undefined)

        console.info(`🏥 > ALLERGY > [POST] User ${user.email} updating allergy with ID ${allergyId}`)
        const updatedAllergy = await updateAllergy(d1Client, allergyData)
        console.info(`🏥 > ALLERGY > [POST] Updated allergy with ID ${updatedAllergy.id}`)
        setResponseStatus(event, 200)
        return updatedAllergy
    } catch (error) {
        return throwH3Error(`🏥 > ALLERGY > [POST] Error updating allergy with ID ${allergyId}`, error)
    }
})
