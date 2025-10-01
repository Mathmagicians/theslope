import {defineEventHandler, getValidatedRouterParams, createError} from "h3"
import {fetchInhabitant} from "~~/server/data/prismaRepository"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import * as z from 'zod'

const {h3eFromCatch} = eventHandlerHelper

// Define schema for ID parameter
const idSchema = z.object({
    id: z.coerce.number().int().positive('Inhabitant ID must be a positive integer')
})

export default defineEventHandler(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    let id
    try {
        const params = await getValidatedRouterParams(event, idSchema.parse)
        id = params.id
    } catch (error) {
        const h3e = h3eFromCatch('🏠👤 > INHABITANT > [GET] Input validation error', error)
        console.error(`🏠👤 > INHABITANT > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }

    try {
        console.info(`🏠👤 > INHABITANT > [GET] Fetching inhabitant with id ${id}`)
        const inhabitant = await fetchInhabitant(d1Client, id)
        console.info(`🏠👤 > INHABITANT > [GET] Returning inhabitant ${inhabitant?.name} ${inhabitant?.lastName}`)
        if (inhabitant) return inhabitant
    } catch (error) {
        const h3e = h3eFromCatch(`🏠👤 > INHABITANT > [GET] Error fetching inhabitant with id ${id}`, error)
        console.error(`🏠👤 > INHABITANT > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }

    throw createError({
        statusCode: 404,
        message: `Inhabitant with ID ${id} not found`
    })

})
