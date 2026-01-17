import {defineEventHandler, getValidatedRouterParams, getValidatedQuery, readValidatedBody, setResponseStatus} from "h3"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {useCoreValidation} from "~/composables/useCoreValidation"
import type {InhabitantUpdate} from "~/composables/useCoreValidation"
import {useBookingValidation, type InhabitantUpdateResponse, type ScaffoldResult} from "~/composables/useBookingValidation"
import {updateInhabitant} from "~~/server/data/prismaRepository"
import {scaffoldPrebookings} from "~~/server/utils/scaffoldPrebookings"
import {z} from 'zod'

const {throwH3Error} = eventHandlerHelper

const idSchema = z.object({
    id: z.coerce.number().int().positive()
})

const querySchema = z.object({
    seasonId: z.coerce.number().int().positive().optional()
})

// Default scaffold result when preferences not updated
const noScaffoldResult = (): ScaffoldResult => ({
    seasonId: null,
    created: 0,
    deleted: 0,
    released: 0,
    claimed: 0,
    claimRejected: 0,
    priceUpdated: 0,
    modeUpdated: 0,
    unchanged: 0,
    households: 0,
    errored: 0
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
        inhabitantData = await readValidatedBody(event, InhabitantUpdateSchema.partial().omit({householdId: true, id: true}).parse)
    } catch (error) {
        return throwH3Error('👩‍🏠 > INHABITANT > [POST] Input validation error', error)
    }

    try {
        console.info(`👩‍🏠 > INHABITANT > [POST] Updating inhabitant with ID ${id}`)
        const updatedInhabitant = await updateInhabitant(d1Client, id, inhabitantData)
        console.info(`👩‍🏠 > INHABITANT > [POST] Successfully updated inhabitant ${updatedInhabitant.name} ${updatedInhabitant.lastName}`)

        // Re-scaffold if dinner preferences OR birthDate changed (affects ticket price category)
        const {InhabitantUpdateResponseSchema} = useBookingValidation()
        let scaffoldResult: ScaffoldResult = noScaffoldResult()

        const shouldRescaffold = inhabitantData.dinnerPreferences !== undefined || inhabitantData.birthDate !== undefined
        if (shouldRescaffold) {
            const reason = [
                inhabitantData.dinnerPreferences !== undefined && 'preferences',
                inhabitantData.birthDate !== undefined && 'birthDate'
            ].filter(Boolean).join('+')
            console.info(`👩‍🏠 > INHABITANT > [POST] ${reason} changed, re-scaffolding household ${updatedInhabitant.householdId}`)
            scaffoldResult = await scaffoldPrebookings(d1Client, {
                seasonId,
                householdId: updatedInhabitant.householdId
            })
        }

        setResponseStatus(event, 200)
        return InhabitantUpdateResponseSchema.parse({
            inhabitant: updatedInhabitant,
            scaffoldResult
        })
    } catch (error) {
        return throwH3Error(`👩‍🏠 > INHABITANT > [POST] Error updating inhabitant with ID ${id}`, error)
    }
})
