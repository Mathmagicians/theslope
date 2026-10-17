// DELETE /api/admin/team/assignments/[assignmentId] - Remove team assignment

import {defineEventHandler,  getValidatedRouterParams} from "h3"
import {idParams} from '~/composables/useCoreValidation'
import {deleteCookingTeamAssignments} from "~~/server/data/prismaRepository"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {throwH3Error} = eventHandlerHelper

// Define schema for parameters
const paramSchema = idParams('id')

export default defineEventHandler(async (event): Promise<number> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    let id!: number

    // Fail early input validation - season id must validate, and season must exist, assignmentid must validate
    try {
        ({id} = await getValidatedRouterParams(event, paramSchema.parse))
    } catch (error) {
        throwH3Error('👥 > ASSIGNMENT > [DELETE] Invalid assignment ID', error)
        return 0 as never
    }

    try {
        console.info(`👥 > ASSIGNMENT > [DELETE] Removing assignment ${id}`)
        const deletedAssignment = await deleteCookingTeamAssignments(d1Client, [id])
        console.info(`👥 > ASSIGNMENT > [DELETE] Successfully removed assignment ${id}`)
        return deletedAssignment
    } catch (error) {
        throwH3Error('👥 > ASSIGNMENT > [DELETE] Error removing assignment', error)
        return 0 as never
    }
})
