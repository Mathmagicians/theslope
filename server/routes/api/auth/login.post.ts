import {defineEventHandler, readValidatedBody, createError} from "h3"
import {loginUserIntoHeynabo} from "~~/server/integration/heynabo"
import {fetchUser} from "~~/server/data/prismaRepository"
import {useUserValidation} from '~/composables/useUserValidation'

const {LoginSchema, UserWithInhabitantSchema} = useUserValidation()

export default defineEventHandler(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation  FAIL EARLY
    let loginData
    try {
        loginData = await readValidatedBody(event, LoginSchema.parse)
    } catch (error) {
        console.error("🔐 > LOGIN > Input validation error:", error)
        throw createError({
            statusCode: 400,
            message: 'Invalid or missing credentials',
            cause: error
        })
    }

    // Heynabo authentication
    let heynaboLoggedIn
    try {
        const { email, password } = loginData
        console.info(`🔐 > LOGIN > Logging in for user ${email}`)
        heynaboLoggedIn = await loginUserIntoHeynabo(email, password)
        console.log("🔐 > LOGIN > Logged into heynabo with user id: ", heynaboLoggedIn.id)
    } catch (error) {
        console.error("🔐 > LOGIN > Heynabo authentication error:", error)
        throw createError({
            statusCode: 404,
            message: 'Invalid Heynabo credentials - cant login with heynabo',
            cause: error
        })
    }

    // Database operations
    try {
        const theSlopeUser = await fetchUser(heynaboLoggedIn.email, d1Client)
        if (!theSlopeUser) {
            throw createError({ statusCode: 404, statusMessage: '🔐 > LOGIN > UNKNOWN USER' })
        }

        // Validate response structure (ADR-009: User includes Inhabitant with household)
        const validatedUser = UserWithInhabitantSchema.parse(theSlopeUser)

        validatedUser.passwordHash = heynaboLoggedIn.token
        await setUserSession(event, {
            user: validatedUser,
            loggedInAt: new Date(),
        })

        return validatedUser
    } catch (error) {
        console.error("🔐 > LOGIN > error setting userSession:", error)
        throw createError({
            statusCode: 500,
            message: '🔐 > LOGIN > Server Error',
            cause: error
        })
    }
})
