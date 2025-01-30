import {defineEventHandler} from "h3";
import {saveUser} from "~/server/data/prismaRepository";

export default defineEventHandler(async (event) => {
    console.log("Adding user to db from event", event.context.cloudflare.env.DB.name)
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    const user = {email: 'jane22@test.com', phone: '(408)-111-2222', passwordHash: 'karamba'} satisfies UserCreate
    const result = await saveUser(d1Client, user)
    return {
        ok: true,
        result: result,
    }
})
