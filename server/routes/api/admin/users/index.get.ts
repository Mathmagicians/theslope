import {defineEventHandler, getValidatedQuery} from "h3"
import {z} from "zod"
import {fetchUsers, fetchUser} from "~~/server/data/prismaRepository"
import type {UserDisplay, UserDetail} from "~/composables/useCoreValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {throwH3Error} = eventHandlerHelper

const querySchema = z.object({
    email: z.string().optional()
})

export default defineEventHandler(async (event): Promise<UserDisplay[] | UserDetail[]> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    let email: string | undefined
    try {
        ({email} = await getValidatedQuery(event, querySchema.parse))
    } catch (error) {
        return throwH3Error('🪪 > USER > [GET] Invalid query parameters', error, 400)
    }

    // If email query parameter is provided, fetch single user by email
    if (email) {
        console.info("🪪 > USER > [GET] Fetching user by email", email)
        try {
            const user = await fetchUser(d1Client, { email })
            const users = user ? [user] : []
            console.info("🪪 > USER > [GET] Found users:", users.length)
            return users
        } catch (error) {
            return throwH3Error(`🪪 > USER > [GET] Error fetching user by email ${email}`, error)
        }
    }

    // Otherwise fetch all users
    console.info("🪪 > USER > [GET] Fetching all users from db")
    try {
        const users = await fetchUsers(d1Client)
        console.info("🪪 > USER > Got users:", users ? users.length : 0)
        return users
    } catch (error) {
        return throwH3Error("🪪 > USER > [GET] Error fetching users", error)
    }
})
