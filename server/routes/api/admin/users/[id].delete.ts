import {defineEventHandler, createError} from "h3"
import {deleteUser} from "~~/server/data/prismaRepository"
import * as z from 'zod'

// Define schema for ID parameter
const idSchema = z.object({
    id: z.coerce.number().int().positive('User ID must be a positive integer')
})

export default defineEventHandler(async (event) => {
    try {
        const {cloudflare} = event.context
        const d1Client = cloudflare.env.DB
        
        // Validate and get the ID from route params using Zod
        const { id } = await getValidatedRouterParams(event, idSchema.parse)
        
        console.log(`👨‍💻 > USER > [DELETE] Deleting user with ID ${id}`)
        
        // Delete the user by ID
        const deletedUser = await deleteUser(d1Client, id)
        console.info(`👨‍💻 > USER > [DELETE] Successfully deleted user ${deletedUser.email}`)
        
        // Return the deleted user
        return deletedUser
    } catch (error) {
        console.error(`👨‍💻 > USER > [DELETE] Error: ${error.message}`)
        
        // For Zod validation errors, return 400
        if (error.name === 'ZodError') {
            throw createError({
                statusCode: 400,
                message: 'Invalid user ID: ' + error.errors[0].message,
                cause: error
            })
        }
        
        // For "not found" errors, return 404
        if (error.message?.includes('Record to delete does not exist')) {
            throw createError({
                statusCode: 404,
                message: 'User not found',
                cause: error
            })
        }
        
        // For other errors, return 500
        throw createError({
            statusCode: 500,
            message: '👨‍💻 > USER > Server Error: ' + error.message,
            cause: error
        })
    }
})