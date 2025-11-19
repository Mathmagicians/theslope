import {Prisma} from "@prisma/client"
import {ZodError} from "zod"
import {H3Error} from "h3"

const PRISMA_RECORD_NOT_FOUND = 'P2025'

type SerializableError = {
    name: string
    message: string
    stack?: string
    code?: string
    meta?: unknown
    issues?: Array<{code: string, path: Array<string | number>, message: string}>
} | string

/**
 * Extract serializable error info to avoid "Cannot stringify arbitrary non-POJOs" errors
 * Zod schemas and Prisma error internals are not POJOs and break Nuxt's devalue serialization
 */
const getSerializableCause = (error: unknown): SerializableError => {
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

const h3eFromCatch = (prepend: string = 'uh oh, an error', error: unknown, statusCode: number = 500): H3Error => {
    // If error is already an H3Error, just re-throw it (pass through from repository layer)
    if (error instanceof H3Error) {
        throw error
    }

    if (error instanceof ZodError || error?.cause?.status === 400 || error?.cause?.statusMessage==='Validation Error') return createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: `${prepend}: Invalid parameters: ${error?.cause?.message}`,
        cause: getSerializableCause(error)
    })

    if (error instanceof Prisma.PrismaClientKnownRequestError) return h3eFromPrismaError(prepend, error)

    if (error instanceof Error) return createError({
        statusCode: statusCode,
        statusMessage: statusCode === 404 ? 'Not Found' : 'Internal Server Error',
        message: `${prepend} - Error: ${error.message}`,
        cause: getSerializableCause(error)
    })

    if (typeof error === 'string') return createError({
        statusCode: statusCode,
        statusMessage: statusCode === 404 ? 'Not Found' : 'Internal Server Error',
        message: `${prepend}: ${error}`,
        cause: error
    })

    return createError({
        statusCode: statusCode,
        statusMessage: statusCode === 404 ? 'Not Found' : 'Internal Server Error',
        message: `${prepend}: Unknown error occurred`,
        cause: getSerializableCause(error)
    })
}

const h3eFromPrismaError = (prepend: string = 'uh oh, a prisma error', error: Prisma.PrismaClientKnownRequestError): H3Error => {
    if (error.code === PRISMA_RECORD_NOT_FOUND) return createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: `${prepend}: Record not found in database: ${error.message} (Code: ${error.code})`,
        cause: getSerializableCause(error)
    })

    return createError({
        statusCode: 500,
        statusMessage: 'Internal Server Error',
        message: `${prepend}: Prisma Client Validation Error: ${error.message}`,
        cause: getSerializableCause(error)
    })
}


/**
 * Log H3Error with appropriate level based on status code
 * @param h3e - The H3Error to log
 * @param originalError - Optional original error for additional context
 */
const logH3Error = (h3e: H3Error, originalError?: unknown): void => {
    if (h3e.statusCode >= 400 && h3e.statusCode < 500) {
        // Client errors (400-499): log as warning
        console.warn(h3e.message)
    } else {
        // Server errors (500+): log as error with original error for stack trace
        console.error(h3e.message, originalError)
    }
}

/**
 * Create H3Error from caught error, log it, and throw
 * Convenience method for the common pattern: catch -> create error -> log -> throw
 *
 * @param prepend - Context message (e.g., "🏠 > HOUSEHOLD > [POST] Input validation error")
 * @param error - The caught error
 * @throws H3Error - Always throws after logging
 *
 * @example
 * try {
 *   const data = await readValidatedBody(event, schema.parse)
 * } catch (error) {
 *   throwH3Error('🏠 > HOUSEHOLD > [POST] Input validation error', error)
 * }
 */
const throwH3Error = (prepend: string, error: unknown, statusCode: number = 500): never => {
    const h3e = h3eFromCatch(prepend, error, statusCode)
    logH3Error(h3e, error)
    throw h3e
}

const eventHandlerHelper = {
    h3eFromCatch,
    h3eFromPrismaError,
    logH3Error,
    throwH3Error
}

export default eventHandlerHelper
