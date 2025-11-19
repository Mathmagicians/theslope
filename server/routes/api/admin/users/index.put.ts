// h3 utilities are auto-imported in Nuxt 4tha
import {saveUser} from "~~/server/data/prismaRepository"
import {useCoreValidation, type UserCreate, type UserDetail} from "~/composables/useCoreValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {throwH3Error} = eventHandlerHelper

export default defineEventHandler(async (event): Promise<UserDetail> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    console.info("🪪 > USER > [PUT] Processing user creation request")

    // Get schema inside handler to avoid circular dependency
    const {UserCreateSchema} = useCoreValidation()

    // Validate input - fail early on invalid data
    let userFromBody!: UserCreate
    try {
        userFromBody = await readValidatedBody(event, UserCreateSchema.parse)
    } catch (error) {
        return throwH3Error('🪪 > USER > [PUT] Input validation error', error)
    }

    // Save user to database
    try {
        console.info(`🪪 > USER > Adding user ${userFromBody.email} to db`)
        const newUser = await saveUser(d1Client, userFromBody)
        console.info(`🪪 > USER > Added user ${newUser.email} to db`)
        setResponseStatus(event, 201)
        return newUser
    } catch (error) {
        return throwH3Error(`🪪 > USER > [PUT] Error saving user ${userFromBody.email}`, error)
    }
})
