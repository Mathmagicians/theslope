import {defineEventHandler, H3Error} from "h3";
import {saveUser} from "~/server/data/prismaRepository"
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
    try {
        const {cloudflare} = event.context
        const d1Client = cloudflare.env.DB
        const userFromQuery = await getValidatedQuery(event, userSchema.parse)
        console.info(`👨‍💻 > USER > Adding user ${userFromQuery.email} to db`)
        const newUser = await saveUser(d1Client, userFromQuery)
        console.info(`👨‍💻 > USER > Added user ${newUser.email} to db`)
        return newUser
    } catch (error) {
        console.error("👨‍💻 > USER > Error saving user: ", error)
        if (error instanceof H3Error) {
            console.error("👨‍💻 > USER > ZodError: ", error.errors)
            throw createError({
                statusCode: 400,
                message: 'Forkert brugerinput',
                cause: error
            })
        } else {
            throw createError({
                statusCode: 500,
                message: '👨‍💻> CREATE > Server Error',
                cause: error
            })
        }
    }
})
