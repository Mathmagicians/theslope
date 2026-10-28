// DELETE /api/admin/team/assignment/[id] - Remove a team assignment, answers its id (ADR-009)

import {defineEventHandler,  getValidatedRouterParams} from "h3"
import {idParams} from '~/composables/useCoreValidation'
import {deleteCookingTeamAssignment} from "~~/server/data/prismaRepository"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {throwH3Error} = eventHandlerHelper

const paramSchema = idParams('id')

export default defineEventHandler(async (event): Promise<number> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    let id!: number

    try {
        ({id} = await getValidatedRouterParams(event, paramSchema.parse))
    } catch (error) {
        return throwH3Error('👥 > ASSIGNMENT > [DELETE] Invalid assignment ID', error)
    }

    try {
        const deletedId = await deleteCookingTeamAssignment(d1Client, id)
        console.info(`👥 > ASSIGNMENT > [DELETE] Removed assignment ${deletedId}`)
        return deletedId
    } catch (error) {
        return throwH3Error(`👥 > ASSIGNMENT > [DELETE] Error removing assignment ${id}`, error)
    }
})
