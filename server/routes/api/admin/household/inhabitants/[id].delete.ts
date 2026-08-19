// DELETE /api/admin/household/inhabitants/:id - remove inhabitant

import {z} from 'zod'
import {getValidatedRouterParams, setResponseStatus} from "h3"
import {deleteInhabitant} from "~~/server/data/prismaRepository"
import {removeChefRoleForInhabitants} from "~~/server/utils/removeChefRole"
import type {InhabitantDetail} from "~/composables/useCoreValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {throwH3Error} = eventHandlerHelper
const paramSchema = z.object({
    id: z.coerce.number().int().positive('Inhabitant ID must be a positive integer')
})

export default defineEventHandler(async (event): Promise<InhabitantDetail> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    let id!: number

    // Input validation try-catch - FAIL EARLY
    try {
        ({id} = await getValidatedRouterParams(event, paramSchema.parse))
    } catch (error) {
        return throwH3Error('🏠👤 DELETE HOUSEHOLD/INHABITANTS/[ID] > Invalid inhabitant ID:', error)
    }

    try {
        console.info(`🏠👤 DELETE HOUSEHOLD/INHABITANTS/[ID]  Deleting inhabitant with id ${id}`)
        // Chef-loss first: deletion SET-NULLs chefId, which would hide their dinners
        const dinnersReset = await removeChefRoleForInhabitants(d1Client, [id])
        if (dinnersReset > 0) {
            console.info(`🏠👤 DELETE HOUSEHOLD/INHABITANTS/[ID]  Reset ${dinnersReset} upcoming dinners cheffed by inhabitant ${id}`)
        }
        const deletedInhabitant = await deleteInhabitant(d1Client, id)
        console.info(`🏠👤 DELETE HOUSEHOLD/INHABITANTS/[ID]  Successfully deleted inhabitant ${deletedInhabitant.name} ${deletedInhabitant.lastName}`)
        setResponseStatus(event, 200)
        return deletedInhabitant
    } catch (error) {
        return throwH3Error(`🏠👤 DELETE HOUSEHOLD/INHABITANTS/[ID]  Error deleting inhabitant with id ${id}`, error)
    }
})
