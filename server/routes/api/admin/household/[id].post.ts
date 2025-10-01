// POST /api/admin/household/[id] - Update household

import {defineEventHandler, readBody, getValidatedRouterParams} from "h3"
import {updateHousehold} from "~~/server/data/prismaRepository"
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
        ({id} = await getValidatedRouterParams(event, idSchema.parse))
    } catch (error) {
        const h3e = h3eFromCatch('🏠 > HOUSEHOLD > [POST] Input validation error', error)
        console.warn(`🏠 > HOUSEHOLD > [POST] ${h3e.statusMessage}`)
        throw h3e
    }

    let householdData
    try {
        householdData = await readBody(event)
    } catch (error) {
        const h3e = h3eFromCatch('🏠 > HOUSEHOLD > [POST] Error reading body', error)
        console.error(`🏠 > HOUSEHOLD > [POST] ${h3e.statusMessage}`, error)
        throw h3e
    }

    // Database operations try-catch - separate concerns
    try {
        console.info("🏠 > HOUSEHOLD > [POST] Updating household", "id", id)
        const updatedHousehold = await updateHousehold(d1Client, id, householdData)

        console.info("🏠 > HOUSEHOLD > [POST] Updated household", "name", updatedHousehold.name)
        return updatedHousehold
    } catch (error) {
        const h3e = h3eFromCatch(`🏠 > HOUSEHOLD > [POST] Error updating household with id ${id}`, error)
        console.error(`🏠 > HOUSEHOLD > [POST] ${h3e.statusMessage}`, error)
        throw h3e
    }
})