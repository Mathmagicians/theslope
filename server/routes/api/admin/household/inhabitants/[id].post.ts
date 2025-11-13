import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {useHouseholdValidation} from "~/composables/useHouseholdValidation"
import type {Inhabitant} from "~/composables/useHouseholdValidation"
import {updateInhabitant} from "~~/server/data/prismaRepository"
import {z} from 'zod'

const {h3eFromCatch} = eventHandlerHelper

const idSchema = z.object({
    id: z.coerce.number().int().positive()
})

export default defineEventHandler<Promise<Inhabitant>>(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    let id, inhabitantData
    try {
        const {InhabitantUpdateSchema} = useHouseholdValidation()
        const params = await getValidatedRouterParams(event, idSchema.parse)
        id = params.id
        inhabitantData = await readValidatedBody(event, InhabitantUpdateSchema.partial().omit({householdId: true, id: true}).parse)
    } catch (error) {
        const h3e = h3eFromCatch('👩‍🏠 > INHABITANT > [POST] Input validation error', error)
        console.warn(`👩‍🏠 > INHABITANT > [POST] ${h3e.statusMessage}`, error)
        throw h3e
    }

    try {
        console.info(`👩‍🏠 > INHABITANT > [POST] Updating inhabitant with ID ${id}`)
        const updatedInhabitant = await updateInhabitant(d1Client, id, inhabitantData)
        console.info(`👩‍🏠 > INHABITANT > [POST] Successfully updated inhabitant ${updatedInhabitant.name} ${updatedInhabitant.lastName}`)
        setResponseStatus(event, 200)
        return updatedInhabitant
    } catch (error) {
        const h3e = h3eFromCatch(`👩‍🏠 > INHABITANT > [POST] Error updating inhabitant with ID ${id}`, error)
        console.error(`👩‍🏠 > INHABITANT > [POST] ${h3e.statusMessage}`, error)
        throw h3e
    }
})
