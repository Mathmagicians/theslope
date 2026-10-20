import {defineEventHandler, getValidatedRouterParams, setResponseStatus, createError} from "h3"
import {fetchInhabitant} from "~~/server/data/prismaRepository"
import type {InhabitantDetail} from "~/composables/useCoreValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {idParams} from '~/composables/useCoreValidation'

const {throwH3Error} = eventHandlerHelper

// Define schema for ID parameter
const paramSchema = idParams('id')

export default defineEventHandler<Promise<InhabitantDetail>>(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    let id!: number
    try {
        const params = await getValidatedRouterParams(event, paramSchema.parse)
        id = params.id
    } catch (error) {
        return throwH3Error('🏠👤 > INHABITANT > [GET] Input validation error', error)
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
        return throwH3Error(`🏠👤 > INHABITANT > [GET] Error fetching inhabitant with id ${id}`, error)
    }

    throw createError({
        statusCode: 404,
        message: `Inhabitant with ID ${id} not found`
    })

})
