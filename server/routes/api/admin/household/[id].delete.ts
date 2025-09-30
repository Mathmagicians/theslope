// DELETE /api/admin/household/[id] - Delete household by ID

import {defineEventHandler, getValidatedRouterParams, setResponseStatus} from "h3"
import {deleteHousehold} from "~~/server/data/prismaRepository"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import * as z from 'zod'

const {h3eFromCatch} = eventHandlerHelper

// Define schema for ID parameter
const idSchema = z.object({
    id: z.coerce.number().int().positive('Household ID must be a positive integer')
})

export default defineEventHandler(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let id
    try {
        const params = await getValidatedRouterParams(event, idSchema.parse)
        id = params.id
    } catch (error) {
        const h3e = h3eFromCatch('🏠 > HOUSEHOLD > [DELETE] Input validation error', error)
        console.warn(`🏠 > HOUSEHOLD > [DELETE] ${h3e.statusMessage}`)
        throw h3e
    }

    // Database operations try-catch - separate concerns
    try {
        console.info("🏠 > HOUSEHOLD > [DELETE] Deleting household", "id", id)
        const deletedHousehold = await deleteHousehold(d1Client, id)

        console.info("🏠 > HOUSEHOLD > [DELETE] Deleted household", "name", deletedHousehold.name)
        setResponseStatus(event, 200)
        return deletedHousehold
    } catch (error) {
        const h3e = h3eFromCatch(`🏠 > HOUSEHOLD > [DELETE] Error deleting household with id ${id}`, error)
        console.error(`🏠 > HOUSEHOLD > [DELETE] ${h3e.statusMessage}`, error)
        throw h3e
    }
})