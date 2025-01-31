import {defineEventHandler} from "h3";
import {fetchUsers} from "~/server/data/prismaRepository";


export default defineEventHandler(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    console.log("Fetching users, db from event", d1Client)
    const users = await fetchUsers(d1Client)
    console.log("Got users from fetchUSers: ", users)
    return {
        ok: true,
        users: users
    }
})
