// GET /api/admin/household/:id - returns the household with the specified ID
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {getValidatedRouterParams} from "h3"
import {fetchHousehold} from "~~/server/data/prismaRepository"
import type {HouseholdWithInhabitants} from "~/composables/useHouseholdValidation"
import * as z from 'zod'

const {h3eFromCatch} = eventHandlerHelper
// Define schema for ID parameter
const idSchema = z.object({
    id: z.coerce.number().int().positive('household ID must be a positive integer')
})

export default defineEventHandler<Promise<HouseholdWithInhabitants>>(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let id
    try {
        ({id}  = await getValidatedRouterParams(event, idSchema.parse))
    } catch (error) {
        const h3e = h3eFromCatch('👥 > TEAM > [GET] Input validation error for team', error)
        console.warn("👥 > TEAM > [GET] Input validation error:", h3e.statusMessage)
        throw h3e
    }

    // Database operations try-catch - separate concerns
    try {
        console.info("🏠 > HOUSEHOLD > [GET] Fetching household", "id", id)
        const household = await fetchHousehold(d1Client, id)
        if (household) {
            console.info("🏠 > HOUSEHOLD > [GET] found household", "name", household.name)
            return household
        }
    } catch (error: any) {
        const h3e = h3eFromCatch(`Error fetching household with id ${id}`, error)
        console.error(`🏠 > HOUSEHOLD > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
    console.info("🏠 > HOUSEHOLD > [GET] Household not found", "id", id)
    throw createError({
        statusCode: 404,
        message: `Household with ID ${id} not found`
    })
})
