import {defineEventHandler, getValidatedRouterParams, setResponseStatus, createError} from "h3"
import {fetchInhabitant} from "~~/server/data/prismaRepository"
import type {InhabitantDetail} from "~/composables/useCoreValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {z} from 'zod'

const {throwH3Error} = eventHandlerHelper

// Define schema for ID parameter
const idSchema = z.object({
    id: z.coerce.number().int().positive('Inhabitant ID must be a positive integer')
})

export default defineEventHandler<Promise<InhabitantDetail>>(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    let id!: number
    try {
        const params = await getValidatedRouterParams(event, idSchema.parse)
        id = params.id
    } catch (error) {
        throwH3Error('🏠👤 > INHABITANT > [GET] Input validation error', error)
    }

    try {
        console.info(`🏠👤 > INHABITANT > [GET] Fetching inhabitant with id ${id}`)
        const inhabitant = await fetchInhabitant(d1Client, id)
        console.info(`🏠👤 > INHABITANT > [GET] Returning inhabitant ${inhabitant?.name} ${inhabitant?.lastName}`)
        if (inhabitant) {
            setResponseStatus(event, 200)
            return inhabitant
        }
    } catch (error) {
        throwH3Error(`🏠👤 > INHABITANT > [GET] Error fetching inhabitant with id ${id}`, error)
    }

    throw createError({
        statusCode: 404,
        message: `Inhabitant with ID ${id} not found`
    })

})
