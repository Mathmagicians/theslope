import {defineEventHandler, createError} from "h3"
import {deleteUser} from "~~/server/data/prismaRepository"
import {ZodError} from 'zod'
import * as z from 'zod'

// Define schema for ID parameter
const idSchema = z.object({
    id: z.coerce.number().int().positive('User ID must be a positive integer')
})

export default defineEventHandler(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Validate input - fail early on invalid data
    let userId: number
    try {
        const { id } = await getValidatedRouterParams(event, idSchema.parse)
        userId = id
    } catch (error) {
        const validationMessage = error instanceof ZodError
            ? error.issues.map((issue: any) => `${issue.path.join('.')}: ${issue.message}`).join(', ')
            : 'Invalid user ID'
        console.warn("👨‍💻 > USER > Validation failed:", validationMessage)
        throw createError({
            statusCode: 400,
            message: '💻 > USER > Invalid user ID',
            cause: error
        })
    }

    // Delete user from database
    try {
        console.info(`👨‍💻 > USER > [DELETE] Deleting user with ID ${userId}`)
        const deletedUser = await deleteUser(d1Client, userId)
        console.info(`👨‍💻 > USER > [DELETE] Deleted user ${deletedUser.email}`)
        return deletedUser
    } catch (error) {
        console.error("👨‍💻 > USER > Error deleting user:", error)
        throw createError({
            statusCode: 500,
            message: '👨‍💻 > USER > Server Error',
            cause: error
        })
    }
})