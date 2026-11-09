import {z} from 'zod'
import {parseDate, DATE_SETTINGS} from '~/utils/date'
import {intervalToDuration, isValid} from 'date-fns'
import {DATE_WORDS} from '~/config/dateWords'

const RULES = DATE_WORDS.rules

// ISO date schema - for HTTP JSON transport (e.g., "2025-01-01T00:00:00.000Z")
const isoDateSchema = z.string()
    .datetime()
    .transform((iso) => new Date(iso))
    .refine((date) => isValid(date), {
        message: RULES.invalidIso
    })

// dd/MM/yyyy date schema - for UI form input (e.g., "01/01/2025" or "1/1/2025")
const ddMMyyyyDateSchema = z.string({
    error: issue => issue.input === undefined
        ? RULES.missing
        : RULES.wrongFormat(DATE_SETTINGS.USER_MASK)
})
    .regex(/^\d{1,2}\/\d{1,2}\/\d{4}$/, RULES.useFormat(DATE_SETTINGS.USER_MASK))
    .describe(RULES.description(DATE_SETTINGS.USER_MASK))
    .transform((dateStr): Date => parseDate(dateStr))
    .refine((date) => isValid(date), {
        message: RULES.invalid(DATE_SETTINGS.USER_MASK)
    })

// Union: Accepts ISO strings (HTTP), dd/MM/yyyy strings (UI), or Date objects
export const dateSchema = z.union([
    isoDateSchema,
    ddMMyyyyDateSchema,
    z.date()
])

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
    z.literal('').transform((): null => null),
    dateSchema,
    z.null()
])

// Pre-built schemas with precise TypeScript types: end is Date in one, Date | null in the other
export const dateRangeSchema = z.object({
    start: dateSchema,
    end: dateSchema
})
    .refine(endAfterStart, { message: RULES.endAfterStart })
    .refine(withinOneYear, { message: RULES.maxOneYear })

export const nullableEndDateRangeSchema = z.object({
    start: dateSchema,
    end: nullableDateSchema
})
    .refine(endAfterStart, { message: RULES.endAfterStart })
