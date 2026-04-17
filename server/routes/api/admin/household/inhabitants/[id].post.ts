import {defineEventHandler, getValidatedRouterParams, getValidatedQuery, readValidatedBody, setResponseStatus} from "h3"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {useCoreValidation} from "~/composables/useCoreValidation"
import type {InhabitantUpdate} from "~/composables/useCoreValidation"
import {useBookingValidation, type InhabitantUpdateResponse} from "~/composables/useBookingValidation"
import {updateInhabitant, fetchInhabitant, fetchHousehold} from "~~/server/data/prismaRepository"
import {rescaffoldOnFieldChange} from "~~/server/utils/scaffoldPrebookings"
import {z} from 'zod'

const {throwH3Error} = eventHandlerHelper

const idSchema = z.object({
    id: z.coerce.number().int().positive()
})

const querySchema = z.object({
    seasonId: z.coerce.number().int().positive().optional()
})

export default defineEventHandler<Promise<InhabitantUpdateResponse>>(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    let id!: number
    let seasonId: number | undefined
    let inhabitantData!: Partial<InhabitantUpdate>
    try {
        const {InhabitantUpdateSchema} = useCoreValidation()
        const params = await getValidatedRouterParams(event, idSchema.parse)
        id = params.id
        const query = await getValidatedQuery(event, querySchema.parse)
        seasonId = query.seasonId
        inhabitantData = await readValidatedBody(event, InhabitantUpdateSchema.partial().omit({id: true}).parse)
    } catch (error) {
        return throwH3Error('👩‍🏠 > INHABITANT > [POST] Input validation error', error)
    }

    try {
        // Validate move: source and target household must share the same heynaboId (same address)
        if (inhabitantData.householdId) {
            const sourceInhabitant = await fetchInhabitant(d1Client, id)
            if (!sourceInhabitant) return throwH3Error('👩‍🏠 > INHABITANT > [POST] Inhabitant not found', {statusCode: 404})
            const [sourceHousehold, targetHousehold] = await Promise.all([
                fetchHousehold(d1Client, sourceInhabitant.householdId),
                fetchHousehold(d1Client, inhabitantData.householdId)
            ])
            if (!sourceHousehold || !targetHousehold) return throwH3Error('👩‍🏠 > INHABITANT > [POST] Household not found', {statusCode: 404})
            if (sourceHousehold.heynaboId !== targetHousehold.heynaboId) {
                console.warn('👩‍🏠 > INHABITANT > [POST] Rejected move between different addresses')
                return throwH3Error('👩‍🏠 > INHABITANT > [POST] Cannot move between different addresses', {statusCode: 400, message: 'Kan kun flytte beboere mellem husstande på samme adresse'})
            }
        }

        console.info(`👩‍🏠 > INHABITANT > [POST] Updating inhabitant with ID ${id}`)
        const updatedInhabitant = await updateInhabitant(d1Client, id, inhabitantData)
        console.info(`👩‍🏠 > INHABITANT > [POST] Successfully updated inhabitant ${updatedInhabitant.name} ${updatedInhabitant.lastName}`)

        // Re-scaffold if preferences, birthDate or householdId changed
        const {InhabitantUpdateResponseSchema} = useBookingValidation()
        const scaffoldResult = await rescaffoldOnFieldChange(
            d1Client, '👩‍🏠 > INHABITANT > [POST]', updatedInhabitant.householdId,
            {preferences: inhabitantData.dinnerPreferences, birthDate: inhabitantData.birthDate, householdId: inhabitantData.householdId},
            seasonId
        )

        setResponseStatus(event, 200)
        return InhabitantUpdateResponseSchema.parse({
            inhabitant: updatedInhabitant,
            scaffoldResult
        })
    } catch (error) {
        return throwH3Error(`👩‍🏠 > INHABITANT > [POST] Error updating inhabitant with ID ${id}`, error)
    }
})
