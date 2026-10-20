// GET /api/admin/household/:id - returns the household with the specified ID
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {getValidatedRouterParams, setResponseStatus, createError} from "h3"
import {fetchHousehold} from "~~/server/data/prismaRepository"
import type {HouseholdDetail} from "~/composables/useCoreValidation"
import {idParams} from '~/composables/useCoreValidation'

const {throwH3Error} = eventHandlerHelper
// Define schema for ID parameter
const paramSchema = idParams('id')

export default defineEventHandler<Promise<HouseholdDetail>>(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let id!: number
    try {
        ({id}  = await getValidatedRouterParams(event, paramSchema.parse))
    } catch (error) {
        throwH3Error('🏠 > HOUSEHOLD > [GET] Input validation error', error)
    }

    // Database operations try-catch - separate concerns
    try {
        console.info("🏠 > HOUSEHOLD > [GET] Fetching household", "id", id)
        const household = await fetchHousehold(d1Client, id)
        if (household) {
            console.info("🏠 > HOUSEHOLD > [GET] found household", "shortName", household.shortName)
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
