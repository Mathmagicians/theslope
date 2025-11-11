// DELETE /api/admin/household/inhabitants/:id - remove inhabitant

import * as z from 'zod'
import {getValidatedRouterParams, setResponseStatus} from "h3"
import {deleteInhabitant} from "~~/server/data/prismaRepository"
import type {Inhabitant} from "~/composables/useHouseholdValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {h3eFromCatch} = eventHandlerHelper
const paramSchema = z.object({
    id: z.coerce.number().int().positive('Inhabitant ID must be a positive integer')
})

export default defineEventHandler(async (event): Promise<Inhabitant> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    let id: number

    // Input validation try-catch - FAIL EARLY
    try {
        ({id} = await getValidatedRouterParams(event, paramSchema.parse))
    } catch (error) {
        const h3e = h3eFromCatch('🏠👤 DELETE HOUSEHOLD/INHABITANTS/[ID] > Invalid inhabitant ID:', error)
        console.warn(h3e.message)
        throw h3e
    }

    try {
        console.info(`🏠👤 DELETE HOUSEHOLD/INHABITANTS/[ID]  Deleting inhabitant with id ${id}`)
        const deletedInhabitant = await deleteInhabitant(d1Client, id)
        console.info(`🏠👤 DELETE HOUSEHOLD/INHABITANTS/[ID]  Successfully deleted inhabitant ${deletedInhabitant.name} ${deletedInhabitant.lastName}`)
        setResponseStatus(event, 200)
        return deletedInhabitant
    } catch (error) {
        const h3e = h3eFromCatch(`🏠👤 DELETE HOUSEHOLD/INHABITANTS/[ID]  Error deleting inhabitant with id ${id}`, error)
        console.error(h3e.message)
        throw h3e
    }
})
