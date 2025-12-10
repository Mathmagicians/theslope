import {defineEventHandler, readValidatedBody, createError} from "h3"
import {loginUserIntoHeynabo} from "~~/server/integration/heynabo/heynaboClient"
import {fetchUser} from "~~/server/data/prismaRepository"
import {useCoreValidation, type UserSession} from '~/composables/useCoreValidation'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const {throwH3Error} = eventHandlerHelper

export default defineEventHandler(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Get schemas inside handler to avoid circular dependency
    const {LoginSchema, UserSessionSchema} = useCoreValidation()

    // Input validation  FAIL EARLY
    let loginData
    try {
        loginData = await readValidatedBody(event, LoginSchema.parse)
    } catch (error) {
        return throwH3Error('🔐 > LOGIN > Invalid or missing credentials', error, 400)
    }

    // Heynabo authentication
    let heynaboLoggedIn
    try {
        const { email, password } = loginData
        console.info(`🔐 > LOGIN > Logging in for user ${email}`)
        heynaboLoggedIn = await loginUserIntoHeynabo(email, password)
        console.log("🔐 > LOGIN > Logged into heynabo with user id: ", heynaboLoggedIn.id)
    } catch (error) {
        return throwH3Error('🔐 > LOGIN > Invalid Heynabo credentials', error, 404)
    }

    // Database operations
    try {
        const theSlopeUser = await fetchUser(heynaboLoggedIn.email, d1Client)
        if (!theSlopeUser) {
            throw createError({ statusCode: 404, statusMessage: '🔐 > LOGIN > UNKNOWN USER' })
        }

        // Validate response structure (ADR-009: User includes Inhabitant with household)
        // UserSessionSchema includes passwordHash - provide Heynabo token during parse
        const validatedUser: UserSession = UserSessionSchema.parse({
            ...theSlopeUser,
            passwordHash: heynaboLoggedIn.token
        })

        await setUserSession(event, {
            user: validatedUser,
            loggedInAt: new Date(),
        })

        return validatedUser
    } catch (error) {
        return throwH3Error('🔐 > LOGIN > Server error', error)
    }
})
