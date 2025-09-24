import {defineEventHandler, H3Error} from "h3";
import {saveUser} from "~~/server/data/prismaRepository"
import * as z  from 'zod'
import {SystemRole} from "@prisma/client"


export const userSchema = z.object({
    email: z.string().email('Email-adressen er ikke gyldig'),
    phone: z.string()
        .regex(/^\+?\d+$/, 'Telefonnummer må kun indeholde tal og eventuelt et plus-tegn i starten')
        .optional(),
    passwordHash: z.string().default('caramba'),
    systemRole: z.nativeEnum(SystemRole).default(SystemRole.USER)
})

export default defineEventHandler(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    console.log("👨‍💻 > USER > data received", getQuery(event))

    // Validate input - fail early on invalid data
    let userFromQuery
    try {
        userFromQuery = await getValidatedQuery(event, userSchema.parse)
    } catch (error) {
        console.error("👨‍💻 > USER > Validation error: ", error)
        throw createError({
            statusCode: 400,
            message: 'Forkert brugerinput',
            cause: error
        })
    }

    // Save user to database
    try {
        console.info(`👨‍💻 > USER > Adding user ${userFromQuery.email} to db`)
        const newUser = await saveUser(d1Client, userFromQuery)
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
