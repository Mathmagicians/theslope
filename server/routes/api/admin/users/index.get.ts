import {defineEventHandler} from "h3";
import {fetchUsers} from "~~/server/data/prismaRepository";


export default defineEventHandler(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    console.log("👨‍💻 > USER > Fetching users from db")
    const users = await fetchUsers(d1Client)
    console.log("👨‍💻 > USER > Got users: ", users ? users.length : 0)
    return users
})
