import type {ZodError, ZodSchema, TypeOf} from 'zod'
import type {Ref} from 'vue'

export const mapZodErrorsToFormErrors = (error: ZodError): Map<string, string[]> => {
    return new Map(
        error.errors.map(err => [err.path[0]?.toString() || '_', [err.message]])
    )
}

/**
 * Parses `value` with `schema` into a form's error map: a success clears the map and
 * returns the parsed data, a failure fills the map and returns undefined.
 */
export const applyValidation = <S extends ZodSchema>(
    schema: S,
    value: unknown,
    errors: Ref<Map<string, string[]>>
): TypeOf<S> | undefined => {
    const validation = schema.safeParse(value)
    if (validation.success) {
        errors.value.clear()
        return validation.data
    }
    const errorMap = mapZodErrorsToFormErrors(validation.error)
    errors.value.clear()
    errorMap.forEach((messages, key) => errors.value.set(key, messages))
    return undefined
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
