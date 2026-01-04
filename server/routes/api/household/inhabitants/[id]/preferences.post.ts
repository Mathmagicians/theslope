import {defineEventHandler, getValidatedRouterParams, getValidatedQuery, readValidatedBody, setResponseStatus} from "h3"
import {z} from 'zod'
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {requireHouseholdAccess} from "~~/server/utils/authorizationHelper"
import {useCoreValidation} from "~/composables/useCoreValidation"
import {useBookingValidation, type InhabitantUpdateResponse, type ScaffoldResult} from "~/composables/useBookingValidation"
import {fetchInhabitant, updateInhabitant} from "~~/server/data/prismaRepository"
import {scaffoldPrebookings} from "~~/server/utils/scaffoldPrebookings"

const {throwH3Error} = eventHandlerHelper

const LOG = '👩‍🏠 > INHABITANT > [PREFERENCES]'

const idSchema = z.object({
    id: z.coerce.number().int().positive()
})

const querySchema = z.object({
    seasonId: z.coerce.number().int().positive().optional()
})

/**
 * POST /api/household/inhabitants/[id]/preferences
 * Update inhabitant dinner preferences (for household members)
 * Requires: authenticated user belongs to same household as inhabitant
 */
export default defineEventHandler<Promise<InhabitantUpdateResponse>>(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    let id!: number
    let seasonId: number | undefined
    let dinnerPreferences: Record<string, string>
    try {
        const {InhabitantUpdateSchema} = useCoreValidation()
        const bodySchema = InhabitantUpdateSchema.pick({dinnerPreferences: true}).required()

        const params = await getValidatedRouterParams(event, idSchema.parse)
        id = params.id
        const query = await getValidatedQuery(event, querySchema.parse)
        seasonId = query.seasonId
        const body = await readValidatedBody(event, bodySchema.parse)
        dinnerPreferences = body.dinnerPreferences!
    } catch (error) {
        return throwH3Error(`${LOG} Input validation error`, error)
    }

    try {
        // Fetch inhabitant to get householdId for authorization
        const inhabitant = await fetchInhabitant(d1Client, id)
        if (!inhabitant) {
            return throwH3Error(`${LOG} Inhabitant ${id} not found`, new Error('Not found'), 404)
        }

        // Verify user belongs to same household
        const user = await requireHouseholdAccess(event, inhabitant.householdId)

        console.info(`${LOG} User ${user.email} updating preferences for inhabitant ${inhabitant.name} ${inhabitant.lastName}`)
        const updatedInhabitant = await updateInhabitant(d1Client, id, {dinnerPreferences})

        // Re-scaffold bookings for this household
        console.info(`${LOG} Re-scaffolding household ${updatedInhabitant.householdId}`)
        const scaffoldResult: ScaffoldResult = await scaffoldPrebookings(d1Client, {
            seasonId,
            householdId: updatedInhabitant.householdId
        })

        const {InhabitantUpdateResponseSchema} = useBookingValidation()
        setResponseStatus(event, 200)
        return InhabitantUpdateResponseSchema.parse({
            inhabitant: updatedInhabitant,
            scaffoldResult
        })
    } catch (error) {
        return throwH3Error(`${LOG} Error updating preferences for inhabitant ${id}`, error)
    }
})
