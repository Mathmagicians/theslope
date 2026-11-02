import {defineEventHandler, readValidatedBody, createError} from "h3"
import {loginUserIntoHeynabo} from "~~/server/integration/heynabo/heynaboClient"
import {fetchUser} from "~~/server/data/prismaRepository"
import {useCoreValidation, type UserDetail} from '~/composables/useCoreValidation'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const {throwH3Error} = eventHandlerHelper

export default defineEventHandler(async (event): Promise<UserDetail> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Get schemas inside handler to avoid circular dependency
    const {LoginSchema} = useCoreValidation()

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
        console.info("🔐 > LOGIN > Logged into heynabo with user id: ", heynaboLoggedIn.id)
    } catch (error) {
        return throwH3Error('🔐 > LOGIN > Invalid Heynabo credentials', error, 404)
    }

    // Database operations
    try {
        // The user with its inhabitant and household, parsed by the repository
        const theSlopeUser = await fetchUser(d1Client, { email: heynaboLoggedIn.email })
        if (!theSlopeUser) {
            throw createError({ statusCode: 404, statusMessage: '🔐 > LOGIN > UNKNOWN USER' })
        }

        // The token stays on the server: nuxt-auth-utils hands `user` to the browser and keeps `secure`
        await setUserSession(event, {
            user: theSlopeUser,
            secure: {heynaboToken: heynaboLoggedIn.token},
            loggedInAt: new Date(),
        })

        return theSlopeUser
    } catch (error) {
        return throwH3Error('🔐 > LOGIN > Server error', error)
    }
})
