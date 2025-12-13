import {Prisma} from "@prisma/client"
import {ZodError} from "zod"
import {H3Error} from "h3"
import type {H3Event} from 'h3'
import type {UserDetail} from '~/composables/useCoreValidation'

const PRISMA_RECORD_NOT_FOUND = 'P2025'

type SerializableError = {
    name: string
    message: string
    stack?: string
    code?: string
    meta?: unknown
    issues?: Array<{code: string, path: Array<string | number>, message: string}>
} | string

interface ErrorCause {
    status?: number
    statusMessage?: string
    message?: string
}

/**
 * Extract serializable error info to avoid "Cannot stringify arbitrary non-POJOs" errors
 * Zod schemas and Prisma error internals are not POJOs and break Nuxt's devalue serialization
 */
const getSerializableCause = (error: unknown): SerializableError => {
    if (error instanceof ZodError) {
        // Extract only serializable parts of ZodError
        return {
            name: 'ZodError',
            message: error.message,
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

    const hasValidationCause = error && typeof error === 'object' && 'cause' in error
    const errorCause: ErrorCause | null = hasValidationCause ? (error as {cause: ErrorCause}).cause : null

    if (error instanceof ZodError || errorCause?.status === 400 || errorCause?.statusMessage === 'Validation Error') {
        let causeMessage = errorCause?.message || ''

        // If ZodError, extract detailed validation issues
        if (error instanceof ZodError) {
            const issueDetails = error.issues.map(issue =>
                `${issue.path.join('.')}: ${issue.message}`
            ).join(', ')
            causeMessage = issueDetails || error.message
        }

        return createError({
            statusCode: 400,
            statusMessage: 'Bad Request',
            message: `${prepend}: Invalid parameters: ${causeMessage}`,
            cause: getSerializableCause(error)
        })
    }

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
const logH3Error = (h3e: H3Error, _originalError?: unknown): void => {
    if (h3e.statusCode >= 400 && h3e.statusCode < 500) {
        console.warn(h3e.message)
    } else {
        console.error(h3e.message)
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

/**
 * Get authenticated user from session
 * Returns null if no session or user not found
 *
 * @param event - H3 event with session context
 * @returns UserDetail or null
 */
const getSessionUser = async (event: H3Event): Promise<UserDetail | null> => {
    const session = await getUserSession(event)
    return (session?.user as UserDetail) ?? null
}

/**
 * Get authenticated user ID from session
 * Returns null if no session or user not found
 * Useful for audit trails where userId is optional
 *
 * @param event - H3 event with session context
 * @returns User ID or null
 */
const getSessionUserId = async (event: H3Event): Promise<number | null> => {
    const user = await getSessionUser(event)
    return user?.id ?? null
}

const eventHandlerHelper = {
    h3eFromCatch,
    h3eFromPrismaError,
    logH3Error,
    throwH3Error,
    getSessionUser,
    getSessionUserId
}

export default eventHandlerHelper
