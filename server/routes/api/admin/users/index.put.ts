import {defineEventHandler} from "h3";
import {saveUser} from "~~/server/data/prismaRepository"
import {useUserValidation, type UserCreate} from "~/composables/useUserValidation"
import {ZodError} from "zod"

const {UserCreateSchema} = useUserValidation()

export default defineEventHandler(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    console.info("👨‍💻 > USER > [PUT] Processing user creation request")

    // Validate input - fail early on invalid data
    let userFromQuery: UserCreate
    try {
        userFromQuery = await getValidatedQuery(event, UserCreateSchema.parse)
    } catch (error) {
        const validationMessage = error instanceof ZodError
            ? error.issues.map((issue: any) => `${issue.path.join('.')}: ${issue.message}`).join(', ')
            : 'Invalid input'
        console.warn("👨‍💻 > USER > Validation failed:", validationMessage)
        throw createError({
            statusCode: 400,
            message: '💻 > USER > Lousy credentials',
            cause: error
        })
    }

    // Save user to database
    try {
        console.info(`👨‍💻 > USER > Adding user ${userFromQuery.email} to db`)
        const newUser = await saveUser(d1Client, userFromo,Query)
        console.info(`👨‍💻 > USER > Added user ${newUser.email} to db`)
        setResponseStatus(event, 201)
        return newUser
    } catch (error) {
        console.error("👨‍💻 > USER > Error saving user: ", error)
        throw createError({
            statusCode: 500,
            message: '👨‍💻 > USER > Server Error',
            cause: error
        })
    }
})
