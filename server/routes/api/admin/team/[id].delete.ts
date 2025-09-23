// DELETE /api/admin/teams/[id] - Delete team

import {defineEventHandler, createError, getValidatedRouterParams} from "h3"
import {deleteTeam} from "~~/server/data/prismaRepository"
import * as z from 'zod'

// Define schema for ID parameter
const idSchema = z.object({
    id: z.coerce.number().int().positive('Team ID must be a positive integer')
})

export default defineEventHandler(async (event) => {
    try {
        const {cloudflare} = event.context
        const d1Client = cloudflare.env.DB

        // Validate and get the ID from route params using Zod
        const { id } = await getValidatedRouterParams(event, idSchema.parse)

        console.log(`👥 > TEAM > [DELETE] Deleting team with id ${id}`)

        // Delete the team
        const deletedTeam = await deleteTeam(d1Client, id)
        console.info(`👥 > TEAM > [DELETE] Successfully deleted team ${deletedTeam.name}`)

        // Return the deleted team
        return deletedTeam
    } catch (error) {
        console.error(`👥 > TEAM > [DELETE] Error: ${error.message}`)

        // For Zod validation errors, return 400
        if (error.name === 'ZodError') {
            throw createError({
                statusCode: 400,
                message: 'Invalid team ID: ' + error.errors[0].message,
                cause: error
            })
        }

        // For "not found" errors, return 404
        if (error.message?.includes('Record to delete does not exist')) {
            throw createError({
                statusCode: 404,
                message: 'Team not found',
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
