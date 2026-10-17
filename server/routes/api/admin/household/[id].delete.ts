// DELETE /api/admin/household/[id] - Delete household by ID

import {defineEventHandler, getValidatedRouterParams, setResponseStatus} from "h3"
import {deleteHousehold} from "~~/server/data/prismaRepository"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import type {HouseholdDetail} from "~/composables/useCoreValidation"
import {idParams} from '~/composables/useCoreValidation'

const {throwH3Error} = eventHandlerHelper

// Define schema for ID parameter
const paramSchema = idParams('id')

export default defineEventHandler(async (event): Promise<HouseholdDetail> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let id!: number
    try {
        const params = await getValidatedRouterParams(event, paramSchema.parse)
        id = params.id
    } catch (error) {
        return throwH3Error('🏠 > HOUSEHOLD > [DELETE] Input validation error', error)
    }

    // Database operations try-catch - separate concerns
    try {
        console.info("🏠 > HOUSEHOLD > [DELETE] Deleting household", "id", id)
        const deletedHousehold = await deleteHousehold(d1Client, id)

        console.info("🏠 > HOUSEHOLD > [DELETE] Deleted household", "name", deletedHousehold.name)
        setResponseStatus(event, 200)
        return deletedHousehold
    } catch (error) {
        return throwH3Error(`🏠 > HOUSEHOLD > [DELETE] Error deleting household with id ${id}`, error)
    }
})
