import {defineEventHandler, getValidatedRouterParams} from "h3"
import {deleteUser} from "~~/server/data/prismaRepository"
import type {UserDetail} from "~/composables/useCoreValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {idParams} from '~/composables/useCoreValidation'

const {throwH3Error} = eventHandlerHelper

// Define schema for ID parameter
const paramSchema = idParams('id')

export default defineEventHandler(async (event): Promise<UserDetail> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Validate input - fail early on invalid data
    let userId!: number
    try {
        const { id } = await getValidatedRouterParams(event, paramSchema.parse)
        userId = id
    } catch (error) {
        return throwH3Error('🪪 > USER > [DELETE] Input validation error', error)
    }

    // Delete user from database
    try {
        console.info(`🪪 > USER > [DELETE] Deleting user with ID ${userId}`)
        const deletedUser = await deleteUser(d1Client, userId)
        console.info(`🪪 > USER > [DELETE] Deleted user ${deletedUser.email}`)
        return deletedUser
    } catch (error) {
        return throwH3Error(`🪪 > USER > [DELETE] Error deleting user with id ${userId}`, error)
    }
})