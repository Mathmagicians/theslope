// h3 utilities are auto-imported in Nuxt 4tha
import {saveUser} from "~~/server/data/prismaRepository"
import {useUserValidation, type UserCreate} from "~/composables/useUserValidation"
import type {User} from "@prisma/client"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {ZodError} from "zod"

const {UserCreateSchema} = useUserValidation()
const {h3eFromCatch} = eventHandlerHelper

export default defineEventHandler(async (event): Promise<User> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    console.info("🪪 > USER > [PUT] Processing user creation request")

    // Validate input - fail early on invalid data
    let userFromBody: UserCreate
    try {
        userFromBody = await readValidatedBody(event, UserCreateSchema.parse)
    } catch (error) {
        const h3e = h3eFromCatch('🪪 > USER > [PUT] Input validation error', error)
        console.error(`🪪 > USER > [PUT] ${h3e.statusMessage}`, error)
        throw h3e
    }

    // Save user to database
    try {
        console.info(`🪪 > USER > Adding user ${userFromBody.email} to db`)
        const newUser = await saveUser(d1Client, userFromBody)
        console.info(`🪪 > USER > Added user ${newUser.email} to db`)
        setResponseStatus(event, 201)
        return newUser
    } catch (error) {
        const h3e = h3eFromCatch(`🪪 > USER > [PUT] Error saving user ${userFromBody.email}`, error)
        console.error(`🪪 > USER > [PUT] ${h3e.statusMessage}`, error)
        throw h3e
    }
})
