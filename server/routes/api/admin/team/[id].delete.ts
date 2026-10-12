import {defineEventHandler, createError, getValidatedRouterParams} from "h3"
import {deleteTeam} from "~~/server/data/prismaRepository"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {idParams} from '~/composables/useCoreValidation'

const {throwH3Error} = eventHandlerHelper

// Define schema for ID parameter
const paramSchema = idParams('id')

export default defineEventHandler(async (event): Promise<number> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let id!: number
    try {
        const params = await getValidatedRouterParams(event, paramSchema.parse)
        id = params.id
    } catch (error) {
        console.error("👥 > TEAM > [DELETE] Input validation error:", error)
        throw createError({
            statusCode: 400,
            message: 'Invalid input data',
            cause: error
        })
    }

    // Database operations try-catch - separate concerns
    try {
        const deleted = await deleteTeam(d1Client, id)
        console.info(`👥 > TEAM > [DELETE] Deleted ${deleted} team(s) with id ${id}`)
        return deleted
    } catch (error) {
        return throwH3Error(`👥 > TEAM > [DELETE] Error deleting team with id ${id}`, error)
    }
})
