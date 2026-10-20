import {z, type ZodError, type ZodType} from 'zod'
import type {Ref} from 'vue'

// Top-level field → its messages; issues on the root land under '_'
export const mapZodErrorsToFormErrors = (error: ZodError): Map<string, string[]> => {
    const {formErrors, fieldErrors} = z.flattenError(error)
    const fields = Object.entries(fieldErrors)
        .filter((entry): entry is [string, string[]] => Array.isArray(entry[1]))
    return new Map(formErrors.length ? [['_', formErrors], ...fields] : fields)
}

/**
 * Parses `value` with `schema` into a form's error map: a success clears the map and
 * returns the parsed data, a failure fills the map and returns undefined.
 */
export const applyValidation = <S extends ZodType>(
    schema: S,
    value: unknown,
    errors: Ref<Map<string, string[]>>
): z.output<S> | undefined => {
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
