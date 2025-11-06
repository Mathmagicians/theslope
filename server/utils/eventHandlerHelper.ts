import {Prisma} from "@prisma/client"
import {ZodError} from "zod"
import {H3Error} from "h3"

const PRISMA_RECORD_NOT_FOUND = 'P2025'

/**
 * Extract serializable error info to avoid "Cannot stringify arbitrary non-POJOs" errors
 * Zod schemas and Prisma error internals are not POJOs and break Nuxt's devalue serialization
 */
const getSerializableCause = (error: unknown): any => {
    if (error instanceof ZodError) {
        // Extract only serializable parts of ZodError
        return {
            name: 'ZodError',
            issues: error.issues.map(issue => ({
                code: issue.code,
                path: issue.path,
                message: issue.message
            }))
        }
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Extract only serializable parts of Prisma error
        return {
            name: 'PrismaError',
            code: error.code,
            meta: error.meta,
            message: error.message
        }
    }
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            stack: error.stack
        }
    }

    // For other types,  return string representation
        return String(error)
}

const h3eFromCatch = (prepend: string = 'uh oh, an error', error: unknown): H3Error => {
    // If error is already an H3Error, just re-throw it (pass through from repository layer)
    if (error instanceof H3Error) {
        throw error
    }

    if (error instanceof ZodError || error?.cause?.status === 400 || error?.cause?.statusMessage==='Validation Error') return createError({
        statusCode: 400,
        message: `${prepend}: Invalid parameters: ${error?.cause?.message}`,
        cause: getSerializableCause(error)
    })

    if (error instanceof Prisma.PrismaClientKnownRequestError) return h3eFromPrismaError(prepend, error)

    if (error instanceof Error) return createError({
        statusCode: 500,
        message: `${prepend} - Error: ${error.message}`,
        cause: getSerializableCause(error)
    })

    if (typeof error === 'string') return createError({
        statusCode: 500,
        message: `${prepend}: ${error})`,
        cause: error
    })

    return createError({
        statusCode: 500,
        message: `${prepend}: Unknown error occurred`,
        cause: getSerializableCause(error)
    })
}

const h3eFromPrismaError = (prepend: string = 'uh oh, a prisma error', error: Prisma.PrismaClientKnownRequestError): H3Error => {
    if (error.code === PRISMA_RECORD_NOT_FOUND) return createError({
        statusCode: 404,
        message: `${prepend}: Record not found in database: ${error.message} (Code: ${error.code})`,
        cause: getSerializableCause(error)
    })

    return createError({
        statusCode: 500,
        message: `${prepend}: Prisma Client Validation Error: ${error.message})`,
        cause: getSerializableCause(error)
    })
}


const eventHandlerHelper = {
    h3eFromCatch,
    h3eFromPrismaError
}

export default eventHandlerHelper
