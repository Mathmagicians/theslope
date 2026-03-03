import {z, type ZodError, type ZodIssue} from 'zod';
import {parseDate, DATE_SETTINGS} from '~/utils/date'
import {intervalToDuration, isValid} from 'date-fns'

// ISO date schema - for HTTP JSON transport (e.g., "2025-01-01T00:00:00.000Z")
const isoDateSchema = z.string()
    .datetime() // Built-in ISO 8601 validation
    .transform((iso) => new Date(iso))
    .refine((date) => isValid(date), {
        message: 'Invalid ISO date'
    })

// dd/MM/yyyy date schema - for UI form input (e.g., "01/01/2025" or "1/1/2025")
const ddMMyyyyDateSchema = z.string({
    required_error: 'Dato mangler',
    invalid_type_error: `Forkert dato format, brug (${DATE_SETTINGS.USER_MASK})`
})
    .regex(/^\d{1,2}\/\d{1,2}\/\d{4}$/, `Brug formatet ${DATE_SETTINGS.USER_MASK}`)
    .describe(`Dato ${DATE_SETTINGS.USER_MASK}`)
    .transform((dateStr): Date => parseDate(dateStr))
    .refine((date) => isValid(date), {
        message: `Ugyldig dato. Brug formatet ${DATE_SETTINGS.USER_MASK}`
    })

// Union: Accepts ISO strings (HTTP), dd/MM/yyyy strings (UI), or Date objects
export const dateSchema = z.union([
    isoDateSchema,
    ddMMyyyyDateSchema,
    z.date()
])

export const stringDateRangeSchema = z.object({
    start: dateSchema,
    end: dateSchema
})

// Shared refinement messages
const END_AFTER_START_MSG = 'Tidsmaskinen er ikke opfundet endnu - slutdato skal være efter startdato'
const MAX_ONE_YEAR_MSG = 'Wow, wow, lidt for meget planlægning - max et år ad gangen'

// Shared refinement predicates (DRY — used by both pre-built schemas and factory)
const endAfterStart = (data: { start: Date, end: Date | null }) => {
    if (data.end === null) return true
    return data.start <= data.end
}

const withinOneYear = (data: { start: Date, end: Date | null }) => {
    if (data.end === null) return true
    return (intervalToDuration({ start: data.start, end: data.end }).years ?? 0) < 1
}

// Nullable date: accepts valid dates, null, or empty string → null (for cleared form inputs)
const nullableDateSchema = z.union([
    z.literal('').transform(() => null as null),
    dateSchema,
    z.null()
])

// Pre-built schemas with precise TypeScript types
// Defined directly (not through factory) so TypeScript correctly infers end: Date vs Date | null
export const dateRangeSchema = z.object({
    start: dateSchema,
    end: dateSchema
})
    .refine(endAfterStart, { message: END_AFTER_START_MSG })
    .refine(withinOneYear, { message: MAX_ONE_YEAR_MSG })

export const nullableEndDateRangeSchema = z.object({
    start: dateSchema,
    end: nullableDateSchema
})
    .refine(endAfterStart, { message: END_AFTER_START_MSG })

/**
 * Factory for date range schemas with composable refinements
 * NOTE: Pre-built schemas (dateRangeSchema, nullableEndDateRangeSchema) are preferred
 * for direct use — they have precise TypeScript types. Use the factory only when
 * you need custom combinations at runtime.
 * @param nullableEnd - Allow null/empty end date (open-ended ranges like move-in/move-out)
 * @param maxOneYear - Enforce max 1 year duration (season planning)
 */
export const createDateRangeSchema = ({ nullableEnd = false, maxOneYear = false } = {}) => {
    const base = z.object({
        start: dateSchema,
        end: nullableEnd ? nullableDateSchema : dateSchema
    }).refine(endAfterStart, { message: END_AFTER_START_MSG })

    if (!maxOneYear) return base

    return base.refine(withinOneYear, { message: MAX_ONE_YEAR_MSG })
}


type RangeAsStrings = {start: string, end: string}

export const mapErrorsToFields = (zodErrors: ZodError) => {
    const fieldMap = new Map<string, string[]>();

    zodErrors.errors.forEach( (issue: ZodIssue) => {
        const path = issue.path.join('.') || '_';
        const existing = fieldMap.get(path) || [];
        fieldMap.set(path, [...existing, issue.message]);
    });

    return fieldMap;
}

export const validateDateRange = ( range: RangeAsStrings ) => {
    const result = dateRangeSchema.safeParse(range)
    return {
        isValid: result.success,
        range: result.success ? result.data : undefined,
        errors: result.success ? new Map() : mapErrorsToFields(result.error)
    }
}
