// POST /api/admin/household/[id] - Update household

import {defineEventHandler, readValidatedBody, getValidatedRouterParams, setResponseStatus} from "h3"
import {updateHousehold} from "~~/server/data/prismaRepository"
import {useCoreValidation} from "~/composables/useCoreValidation"
import type {HouseholdDetail, HouseholdUpdate} from "~/composables/useCoreValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {z} from 'zod'

const {throwH3Error} = eventHandlerHelper

// Define schema for ID parameter
const idSchema = z.object({
    id: z.coerce.number().int().positive('Household ID must be a positive integer')
})

export default defineEventHandler<Promise<HouseholdDetail>>(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Get schema inside handler to avoid circular dependency
    const {HouseholdUpdateSchema} = useCoreValidation()

    // Input validation try-catch - FAIL EARLY
    let id!: number
    let householdData!: Partial<HouseholdUpdate>
    try {
        ({id} = await getValidatedRouterParams(event, idSchema.parse))
        householdData = await readValidatedBody(event, HouseholdUpdateSchema.omit({id: true}).parse)
    } catch (error) {
        throwH3Error('🏠 > HOUSEHOLD > [POST] Input validation error', error)
    }

    // Database operations try-catch - separate concerns
    try {
        console.info("🏠 > HOUSEHOLD > [POST] Updating household", "id", id)
        const updatedHousehold = await updateHousehold(d1Client, id, householdData)

        console.info("🏠 > HOUSEHOLD > [POST] Updated household", "name", updatedHousehold.name)
        setResponseStatus(event, 200)
        return updatedHousehold
    } catch (error) {
        throwH3Error(`🏠 > HOUSEHOLD > [POST] Error updating household with id ${id}`, error)
    }
})
