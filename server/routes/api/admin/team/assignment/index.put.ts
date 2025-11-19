// PUT /api/admin/team/assignment - Create single team member assignment

import {defineEventHandler, readValidatedBody, setResponseStatus} from "h3"
import {createTeamAssignment} from "~~/server/data/prismaRepository"
import {useCookingTeamValidation} from "~/composables/useCookingTeamValidation"
import type {CookingTeamAssignment, CookingTeamAssignmentCreate} from "~/composables/useCookingTeamValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {throwH3Error} = eventHandlerHelper

// Get schema from composable and refine for create operation (remove optional id)
const {CookingTeamAssignmentSchema} = useCookingTeamValidation()
const TeamAssignmentCreateSchema = CookingTeamAssignmentSchema.omit({ id: true })

export default defineEventHandler(async (event): Promise<CookingTeamAssignment> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let assignmentData!: CookingTeamAssignmentCreate
    try {
        assignmentData = await readValidatedBody(event, TeamAssignmentCreateSchema.parse)
    } catch (error) {
        return throwH3Error('👥🔗 > ASSIGNMENT > [PUT] Input validation error', error)
    }

    // Database operations try-catch - separate concerns
    try {
        console.log(`👥🔗 > ASSIGNMENT > [PUT] Creating assignment for inhabitant ${assignmentData.inhabitantId} to team ${assignmentData.cookingTeamId} as ${assignmentData.role}`)
        const assignment = await createTeamAssignment(d1Client, assignmentData)
        console.info(`👥🔗 > ASSIGNMENT > [PUT] Successfully created assignment with ID ${assignment.id}`)
        setResponseStatus(event, 201)
        return assignment
    } catch (error) {
        return throwH3Error(`👥🔗 > ASSIGNMENT > [PUT] Error creating team assignment`, error)
    }
})
