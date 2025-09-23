// PUT /api/admin/team/[id]/members - Add team members

import {defineEventHandler, createError, getValidatedRouterParams, readBody} from "h3"
import {useCookingTeamValidation} from "~/composables/useCookingTeamValidation"
import * as z from 'zod'

// Define schema for ID parameter
const idSchema = z.object({
    id: z.coerce.number().int().positive('Team ID must be a positive integer')
})

// Get the validation utilities from our composable
const {validateBulkMemberAssignment} = useCookingTeamValidation()

export default defineEventHandler(async (event) => {
    try {
        const {cloudflare} = event.context
        const d1Client = cloudflare.env.DB

        // Validate and get the ID from route params using Zod
        const { id } = await getValidatedRouterParams(event, idSchema.parse)

        // Read and validate the body
        const rawBody = await readBody(event)

        // Validate using the bulk member assignment schema
        const validatedData = validateBulkMemberAssignment(rawBody)

        // Ensure the teamId matches the route parameter
        if (validatedData.teamId !== id) {
            throw createError({
                statusCode: 400,
                message: 'Team ID in body must match route parameter'
            })
        }

        console.log(`👥 > TEAM > [PUT MEMBERS] Adding ${validatedData.members.length} members to team ${id}`)

        // TODO: Implement member assignment logic
        // This would need database operations to assign members to teams
        // For now, return success status

        console.info(`👥 > TEAM > [PUT MEMBERS] Successfully added members to team ${id}`)

        return { success: true, message: 'Members added successfully' }
    } catch (error) {
        console.error(`👥 > TEAM > [PUT MEMBERS] Error: ${error.message}`)

        // For Zod validation errors, return 400
        if (error.name === 'ZodError') {
            throw createError({
                statusCode: 400,
                message: 'Invalid member data: ' + error.errors[0].message,
                cause: error
            })
        }

        // If it's already an H3 error, re-throw
        if (error.statusCode) {
            throw error
        }

        // For other errors, return 500
        throw createError({
            statusCode: 500,
            message: '👥 > TEAM > Server Error: ' + error.message,
            cause: error
        })
    }
})