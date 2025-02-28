import {type ZodError} from 'zod'

export const mapZodErrorsToFormErrors = (error: ZodError): Map<string, string[]> => {
    return new Map(
        error.errors.map(err => [err.path[0]?.toString() || '_', [err.message]])
    )
}
