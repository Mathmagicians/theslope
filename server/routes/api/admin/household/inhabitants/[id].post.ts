import {defineEventHandler, getValidatedRouterParams, readValidatedBody, setResponseStatus} from "h3"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {useCoreValidation} from "~/composables/useCoreValidation"
import type {InhabitantDetail, InhabitantUpdate} from "~/composables/useCoreValidation"
import {updateInhabitant} from "~~/server/data/prismaRepository"
import {z} from 'zod'

const {throwH3Error} = eventHandlerHelper

const idSchema = z.object({
    id: z.coerce.number().int().positive()
})

export default defineEventHandler<Promise<InhabitantDetail>>(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    let id!: number
    let inhabitantData!: Partial<InhabitantUpdate>
    try {
        const {InhabitantUpdateSchema} = useCoreValidation()
        const params = await getValidatedRouterParams(event, idSchema.parse)
        id = params.id
        inhabitantData = await readValidatedBody(event, InhabitantUpdateSchema.partial().omit({householdId: true, id: true}).parse)
    } catch (error) {
        throwH3Error('👩‍🏠 > INHABITANT > [POST] Input validation error', error)
    }

    try {
        console.info(`👩‍🏠 > INHABITANT > [POST] Updating inhabitant with ID ${id}`)
        const updatedInhabitant = await updateInhabitant(d1Client, id, inhabitantData)
        console.info(`👩‍🏠 > INHABITANT > [POST] Successfully updated inhabitant ${updatedInhabitant.name} ${updatedInhabitant.lastName}`)
        setResponseStatus(event, 200)
        return updatedInhabitant
    } catch (error) {
        throwH3Error(`👩‍🏠 > INHABITANT > [POST] Error updating inhabitant with ID ${id}`, error)
    }
})
