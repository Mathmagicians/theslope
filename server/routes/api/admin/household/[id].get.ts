// GET /api/admin/household/:id - returns the household with the specified ID
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {getValidatedRouterParams, setResponseStatus, createError} from "h3"
import {fetchHousehold} from "~~/server/data/prismaRepository"
import type {HouseholdDetail} from "~/composables/useCoreValidation"
import {z} from 'zod'

const {throwH3Error} = eventHandlerHelper
// Define schema for ID parameter
const idSchema = z.object({
    id: z.coerce.number().int().positive('household ID must be a positive integer')
})

export default defineEventHandler<Promise<HouseholdDetail>>(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let id!: number
    try {
        ({id}  = await getValidatedRouterParams(event, idSchema.parse))
    } catch (error) {
        throwH3Error('🏠 > HOUSEHOLD > [GET] Input validation error', error)
    }

    // Database operations try-catch - separate concerns
    try {
        console.info("🏠 > HOUSEHOLD > [GET] Fetching household", "id", id)
        const household = await fetchHousehold(d1Client, id)
        if (household) {
            console.info("🏠 > HOUSEHOLD > [GET] found household", "name", household.name)
            setResponseStatus(event, 200)
            return household
        }
    } catch (error: unknown) {
        return throwH3Error(`Error fetching household with id ${id}`, error)
    }
    console.info("🏠 > HOUSEHOLD > [GET] Household not found", "id", id)
    throw createError({
        statusCode: 404,
        message: `Household with ID ${id} not found`
    })
})
