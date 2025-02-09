import {defineEventHandler} from "h3"
import {loginUserIntoHeynabo} from "~/server/integration/heynabo"
import {fetchUser} from "~/server/data/prismaRepository"
import { z } from 'zod'

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().nonempty(),

})

export default defineEventHandler(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB
    const { email, password } = await readValidatedBody(event, body => loginSchema.parse(body))
    const heynaboLoggedIn = await loginUserIntoHeynabo(email, password)
    console.log("🔐 > LOGIN > Logged into heynabo with user id: ", heynaboLoggedIn.id)
    const theSlopeUser = await fetchUser(heynaboLoggedIn.email, d1Client)
    await setUserSession(event, {
        user: theSlopeUser!,
        loggedInAt: new Date(),
    })
    return theSlopeUser
})
