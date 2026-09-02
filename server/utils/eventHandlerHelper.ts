import {Prisma} from "@prisma/client"
import {ZodError} from "zod"
import {H3Error} from "h3"
import type {H3Event} from 'h3'
import type {NuxtError} from 'nuxt/app'
import type {UserDetail} from '~/composables/useCoreValidation'

const PRISMA_RECORD_NOT_FOUND = 'P2025'

/**
 * Check if error is Prisma "record not found" (P2025)
 * Useful for atomic WHERE clauses where not-found indicates a race condition
 */
const isPrismaNotFound = (error: unknown): boolean =>
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === PRISMA_RECORD_NOT_FOUND

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

const nuxtErrorFromCatch = (prepend: string = 'uh oh, an error', error: unknown, statusCode: number = 500): NuxtError => {
    // If error is already an H3Error, return it (let throwNuxtError handle logging)
    if (error instanceof H3Error) {
        return error
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

    if (error instanceof Prisma.PrismaClientKnownRequestError) return nuxtErrorFromPrismaError(prepend, error)

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

const nuxtErrorFromPrismaError = (prepend: string = 'uh oh, a prisma error', error: Prisma.PrismaClientKnownRequestError): NuxtError => {
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
 * Log NuxtError with appropriate level based on status code
 * @param nuxtError - The NuxtError to log
 * @param originalError - Optional original error for additional context
 */
const logNuxtError = (nuxtError: NuxtError, originalError?: unknown): void => {
    const status = nuxtError.statusCode ?? 500
    if (status >= 400 && status < 500) {
        console.warn(nuxtError.message)
    } else {
        console.error(nuxtError.message)
        // For 500 errors, log original error details for debugging
        if (originalError instanceof Error) {
            console.error(`  ↳ Original error: ${originalError.name}: ${originalError.message}`)
            if (originalError.cause) {
                console.error(`  ↳ Cause: ${JSON.stringify(originalError.cause, null, 2)}`)
            }
        }
    }
}

/**
 * Create NuxtError from caught error, log it, and throw
 * Convenience method for the common pattern: catch -> create error -> log -> throw
 *
 * @param prepend - Context message (e.g., "🏠 > HOUSEHOLD > [POST] Input validation error")
 * @param error - The caught error
 * @throws NuxtError - Always throws after logging
 *
 * @example
 * try {
 *   const data = await readValidatedBody(event, schema.parse)
 * } catch (error) {
 *   throwNuxtError('🏠 > HOUSEHOLD > [POST] Input validation error', error)
 * }
 */
const throwNuxtError = (prepend: string, error: unknown, statusCode: number = 500): never => {
    const nuxtError = nuxtErrorFromCatch(prepend, error, statusCode)
    logNuxtError(nuxtError, error)
    throw nuxtError
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
    isPrismaNotFound,
    nuxtErrorFromCatch,
    nuxtErrorFromPrismaError,
    logNuxtError,
    throwNuxtError,
    // Backwards-compatible aliases (used across 80+ call sites)
    throwH3Error: throwNuxtError,
    h3eFromCatch: nuxtErrorFromCatch,
    h3eFromPrismaError: nuxtErrorFromPrismaError,
    logH3Error: logNuxtError,
    getSessionUser,
    getSessionUserId
}

export default eventHandlerHelper
