// DELETE /api/admin/teams/[id] - Delete

import {defineEventHandler, createError, getValidatedRouterParams} from "h3"
import {deleteTeam} from "~~/server/data/prismaRepository"
import * as z from 'zod'

// Define schema for ID parameter
const idSchema = z.object({
    id: z.coerce.number().int().positive('Team ID must be a positive integer')
})

export default defineEventHandler(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let id
    try {
        const params = await getValidatedRouterParams(event, idSchema.parse)
        id = params.id
    } catch (error) {
        console.error("👥 > TEAM > [DELETE] Input validation error:", error)
        throw createError({
            statusCode: 400,
            message: 'Invalid input data',
            cause: error
        })
    }

    // Database operations try-catch - separate concerns
    try {
        console.log(`👥 > TEAM > [DELETE] Deleting team with id ${id}`)
        const deletedTeam = await deleteTeam(d1Client, id)
        console.info(`👥 > TEAM > [DELETE] Successfully deleted team ${deletedTeam.name}`)
        return deletedTeam
    } catch (error) {
        console.error("👥 > TEAM > [DELETE] Error deleting team:", error)

        // For "not found" errors, return 404
        if (error.message?.includes('Record to delete does not exist')) {
            throw createError({
                statusCode: 404,
                message: 'Team not found',
                cause: error
            })
        }

        throw createError({
            statusCode: 500,
            message: '👥 > TEAM > Server Error',
            cause: error
        })
    }
})
