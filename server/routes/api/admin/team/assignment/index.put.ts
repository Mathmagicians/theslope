// PUT /api/admin/team/assignment - Create single team member assignment
// Note: cookingTeamId comes in body (not URL), so we use CookingTeamAssignment.omit({id})

import {defineEventHandler, readValidatedBody, setResponseStatus} from "h3"
import {createTeamAssignment} from "~~/server/data/prismaRepository"
import type {CookingTeamAssignment} from "~/composables/useCookingTeamValidation"
import {useCookingTeamValidation} from "~/composables/useCookingTeamValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {throwH3Error} = eventHandlerHelper

// Get base schema from composable
const {CookingTeamAssignmentSchema} = useCookingTeamValidation()

// For this endpoint, cookingTeamId is in body (not URL param), so only omit id and inhabitant
// inhabitant is populated by Prisma include on response, not provided by client
const AssignmentCreateSchema = CookingTeamAssignmentSchema.omit({ id: true, inhabitant: true })

// Input type: assignment without id and inhabitant (cookingTeamId required in body)
type AssignmentCreateInput = Omit<CookingTeamAssignment, 'id' | 'inhabitant'>

export default defineEventHandler(async (event): Promise<CookingTeamAssignment> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let assignmentData!: AssignmentCreateInput
    try {
        assignmentData = await readValidatedBody(event, AssignmentCreateSchema.parse)
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
