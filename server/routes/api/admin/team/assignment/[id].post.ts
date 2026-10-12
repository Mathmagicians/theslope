// POST /api/admin/team/assignment/[id] - Update a team member's seat (role, allocation, weekdays)

import {defineEventHandler, getValidatedRouterParams, readValidatedBody} from "h3"
import {updateTeamAssignment} from "~~/server/data/prismaRepository"
import type {CookingTeamAssignment, CookingTeamAssignmentUpdate} from "~/composables/useCookingTeamValidation"
import {useCookingTeamValidation} from "~/composables/useCookingTeamValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {idParams} from '~/composables/useCoreValidation'

const {throwH3Error} = eventHandlerHelper

const paramSchema = idParams('id')

const {CookingTeamAssignmentUpdateSchema} = useCookingTeamValidation()

export default defineEventHandler(async (event): Promise<CookingTeamAssignment> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let id!: number
    let updateData!: CookingTeamAssignmentUpdate
    try {
        ({id} = await getValidatedRouterParams(event, paramSchema.parse))
        updateData = await readValidatedBody(event, CookingTeamAssignmentUpdateSchema.parse)
    } catch (error) {
        return throwH3Error('👥🔗 > ASSIGNMENT > [POST] Input validation error', error)
    }

    // Database operations try-catch - separate concerns
    try {
        console.info(`👥🔗 > ASSIGNMENT > [POST] Updating assignment ${id}`)
        const assignment = await updateTeamAssignment(d1Client, id, updateData)
        console.info(`👥🔗 > ASSIGNMENT > [POST] Updated assignment ${id} to ${assignment.role} at ${assignment.allocationPercentage}%`)
        return assignment
    } catch (error) {
        return throwH3Error(`👥🔗 > ASSIGNMENT > [POST] Error updating assignment ${id}`, error)
    }
})
