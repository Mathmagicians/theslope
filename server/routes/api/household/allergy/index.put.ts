import {defineEventHandler, getValidatedQuery, readValidatedBody, setResponseStatus} from "h3"
import {createAllergy} from "~~/server/data/allergyRepository"
import {fetchInhabitant} from "~~/server/data/prismaRepository"
import {useAllergyValidation, type AllergyDetail, type AllergyCreate} from "~/composables/useAllergyValidation"
import {AdminBypassQuerySchema} from '~/composables/useCoreValidation'
import {canMutateAllergies} from '~/composables/usePermissions'
import {requireHouseholdAccess} from "~~/server/utils/authorizationHelper"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {throwH3Error} = eventHandlerHelper

/**
 * PUT /api/household/allergy - add an allergy to an inhabitant
 * Requires: authenticated user belongs to the inhabitant's household; with `?adminBypass=true` an admin or the allergy
 * manager adds it to any household's inhabitant (ADR-004)
 */
export default defineEventHandler(async (event): Promise<AllergyDetail> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    const {AllergyCreateSchema} = useAllergyValidation()

    // Validate input - fail early on invalid data
    let allergyData!: AllergyCreate
    let adminBypass!: boolean
    try {
        allergyData = await readValidatedBody(event, AllergyCreateSchema.parse)
        adminBypass = (await getValidatedQuery(event, AdminBypassQuerySchema.parse)).adminBypass
    } catch (error) {
        return throwH3Error('🏥 > ALLERGY > [PUT] Input validation error', error)
    }

    // Create allergy in database
    try {
        const inhabitant = await fetchInhabitant(d1Client, allergyData.inhabitantId)
        if (!inhabitant) {
            return throwH3Error(`🏥 > ALLERGY > [PUT] Inhabitant ${allergyData.inhabitantId} not found`, new Error('Not found'), 404)
        }
        const user = await requireHouseholdAccess(event, inhabitant.householdId, adminBypass ? canMutateAllergies : undefined)

        console.info(`🏥 > ALLERGY > [PUT] User ${user.email} creating allergy for inhabitant ${allergyData.inhabitantId}`)
        const newAllergy = await createAllergy(d1Client, allergyData)
        console.info(`🏥 > ALLERGY > [PUT] Created allergy with ID ${newAllergy.id}`)
        setResponseStatus(event, 201)
        return newAllergy
    } catch (error) {
        return throwH3Error(`🏥 > ALLERGY > [PUT] Error creating allergy for inhabitant ${allergyData.inhabitantId}`, error)
    }
})
