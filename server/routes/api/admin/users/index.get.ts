import {defineEventHandler, createError} from "h3";
import {fetchUsers} from "~~/server/data/prismaRepository";
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {h3eFromCatch} = eventHandlerHelper

export default defineEventHandler(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    console.info("👨‍💻 > USER > [GET] Fetching users from db")

    // Fetch users from database
    try {
        const users = await fetchUsers(d1Client)
        console.info("👨‍💻 > USER > Got users:", users ? users.length : 0)
        return users
    } catch (error) {
        const h3e = h3eFromCatch("👨‍💻 > USER > [GET] Error fetching users", error)
        console.error(`👨‍💻 > USER > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
})
