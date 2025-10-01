import {defineEventHandler, createError, getValidatedRouterParams} from "h3"
import {deleteUser} from "~~/server/data/prismaRepository"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {ZodError} from 'zod'
import * as z from 'zod'

const {h3eFromCatch} = eventHandlerHelper

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
        const h3e = h3eFromCatch('👨‍💻 > USER > [DELETE] Input validation error', error)
        console.error(`👨‍💻 > USER > [DELETE] ${h3e.statusMessage}`, error)
        throw h3e
    }

    // Delete user from database
    try {
        console.info(`👨‍💻 > USER > [DELETE] Deleting user with ID ${userId}`)
        const deletedUser = await deleteUser(d1Client, userId)
        console.info(`👨‍💻 > USER > [DELETE] Deleted user ${deletedUser.email}`)
        return deletedUser
    } catch (error) {
        const h3e = h3eFromCatch(`👨‍💻 > USER > [DELETE] Error deleting user with id ${userId}`, error)
        console.error(`👨‍💻 > USER > [DELETE] ${h3e.statusMessage}`, error)
        throw h3e
    }
})