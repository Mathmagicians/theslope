import {defineEventHandler, createError} from "h3";
import {fetchUsers} from "~~/server/data/prismaRepository";

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
        console.error("👨‍💻 > USER > Error fetching users:", error)
        throw createError({
            statusCode: 500,
            message: '👨‍💻 > USER > Server Error',
            cause: error
        })
    }
})
