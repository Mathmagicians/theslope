import {defineEventHandler, getQuery} from "h3";
import {fetchUsers, fetchUser, type UserWithInhabitant} from "~~/server/data/prismaRepository";
import type {UserDisplay} from "~/composables/useUserValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {h3eFromCatch} = eventHandlerHelper

export default defineEventHandler(async (event): Promise<UserDisplay[] | UserWithInhabitant[]> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    const query = getQuery(event)
    const email = query.email as string | undefined

    // If email query parameter is provided, fetch single user by email
    if (email) {
        console.info("🪪 > USER > [GET] Fetching user by email", email)
        try {
            const user = await fetchUser(email, d1Client)
            const users = user ? [user] : []
            console.info("🪪 > USER > [GET] Found users:", users.length)
            return users
        } catch (error) {
            const h3e = h3eFromCatch(`🪪 > USER > [GET] Error fetching user by email ${email}`, error)
            console.error(`🪪 > USER > [GET] ${h3e.statusMessage}`, error)
            throw h3e
        }
    }

    // Otherwise fetch all users
    console.info("🪪 > USER > [GET] Fetching all users from db")
    try {
        const users = await fetchUsers(d1Client)
        console.info("🪪 > USER > Got users:", users ? users.length : 0)
        return users
    } catch (error) {
        const h3e = h3eFromCatch("🪪 > USER > [GET] Error fetching users", error)
        console.error(`🪪 > USER > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
})
