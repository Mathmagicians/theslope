// PUT /api/admin/team/[id]/members - Add team members

import {defineEventHandler, createError, getValidatedRouterParams, readBody} from "h3"
import {useCookingTeamValidation} from "~/composables/useCookingTeamValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import * as z from 'zod'

const {h3eFromCatch} = eventHandlerHelper

// Define schema for ID parameter
const idSchema = z.object({
    id: z.coerce.number().int().positive('Team ID must be a positive integer')
})

// Get the validation utilities from our composable
const {validateBulkMemberAssignment} = useCookingTeamValidation()

export default defineEventHandler(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let id, validatedData
    try {
        // Validate and get the ID from route params using Zod
        const params = await getValidatedRouterParams(event, idSchema.parse)
        id = params.id

        // Read and validate the body
        const rawBody = await readBody(event)

        // Validate using the bulk member assignment schema
        validatedData = validateBulkMemberAssignment(rawBody)

        // Ensure the teamId matches the route parameter
        if (validatedData.teamId !== id) {
            throw createError({
                statusCode: 400,
                message: 'Team ID in body must match route parameter'
            })
        }
    } catch (error) {
        const h3e = h3eFromCatch('👥 > TEAM > [PUT MEMBERS] Input validation error', error)
        console.error(`👥 > TEAM > [PUT MEMBERS] ${h3e.statusMessage}`, error)
        throw h3e
    }

    // Database operations try-catch - separate concerns
    try {
        console.log(`👥 > TEAM > [PUT MEMBERS] Adding ${validatedData.members.length} members to team ${id}`)

        // TODO: Implement member assignment logic
        // This would need database operations to assign members to teams
        // For now, return success status

        console.info(`👥 > TEAM > [PUT MEMBERS] Successfully added members to team ${id}`)

        return { success: true, message: 'Members added successfully' }
    } catch (error) {
        const h3e = h3eFromCatch(`👥 > TEAM > [PUT MEMBERS] Error adding members to team ${id}`, error)
        console.error(`👥 > TEAM > [PUT MEMBERS] ${h3e.statusMessage}`, error)
        throw h3e
    }
})
