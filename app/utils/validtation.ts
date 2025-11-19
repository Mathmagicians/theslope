import type {ZodError} from 'zod'

export const mapZodErrorsToFormErrors = (error: ZodError): Map<string, string[]> => {
    return new Map(
        error.errors.map(err => [err.path[0]?.toString() || '_', [err.message]])
    )
}

/**
 * Gets the first error message from an error Map with fallbacks
 * @param errors Map of error messages 
 * @param keys Array of keys to check in order of priority
 * @param defaultValue Default value if no error is found
 * @returns The first error message found or the default value
 */
export const getErrorMessage = (
    errors: Map<string, string[]>, 
    keys: string[] = ['_'], 
    defaultValue: string = ''
): string => {
    for (const key of keys) {
        const error = errors.get(key)?.[0]
        if (error) return error
    }
    return defaultValue
}
