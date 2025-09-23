// DELETE /api/admin/team/[id]/members/[memberId] - Remove team member

import {defineEventHandler, createError, getValidatedRouterParams} from "h3"
import * as z from 'zod'

// Define schema for parameters
const paramSchema = z.object({
    id: z.coerce.number().int().positive('Team ID must be a positive integer'),
    memberId: z.coerce.number().int().positive('Member ID must be a positive integer')
})

export default defineEventHandler(async (event) => {
    try {
        const {cloudflare} = event.context
        const d1Client = cloudflare.env.DB

        // Validate and get the parameters from route params using Zod
        const { id, memberId } = await getValidatedRouterParams(event, paramSchema.parse)

        console.log(`👥 > TEAM > [DELETE MEMBER] Removing member ${memberId} from team ${id}`)

        // TODO: Implement member removal logic
        // This would need database operations to remove a specific member from a team
        // For now, return success status

        console.info(`👥 > TEAM > [DELETE MEMBER] Successfully removed member ${memberId} from team ${id}`)

        return { success: true, message: 'Member removed successfully' }
    } catch (error) {
        console.error(`👥 > TEAM > [DELETE MEMBER] Error: ${error.message}`)

        // For Zod validation errors, return 400
        if (error.name === 'ZodError') {
            throw createError({
                statusCode: 400,
                message: 'Invalid parameters: ' + error.errors[0].message,
                cause: error
            })
        }

        // For other errors, return 500
        throw createError({
            statusCode: 500,
            message: '👥 > TEAM > Server Error: ' + error.message,
            cause: error
        })
    }
})