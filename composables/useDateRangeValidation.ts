import {z, ZodError, type ZodIssue} from 'zod'
import {parseDate, DATE_SETTINGS} from '~/utils/date'
import {intervalToDuration, isValid} from 'date-fns'

const dateSchema = z.string({
    required_error: 'Dato mangler',
    invalid_type_error: `Forkert dato format, brug (${DATE_SETTINGS.USER_MASK})`
})
    .describe(`Dato ${DATE_SETTINGS.USER_MASK}`)
    .transform((dateStr): Date => parseDate(dateStr))
    .refine((date) => isValid(date), {
        message: `Ugyldig dato. Brug formatet ${DATE_SETTINGS.USER_MASK}`
    })

const baseDateRangeSchema = z.object({
    start: z.date().describe('Startdato'),
    end: z.date().describe('Slutdato')
})

export const stringDateRangeSchema = z.object({
    start: dateSchema,
    end: dateSchema
})

export const dateRangeSchema = z.union([
    stringDateRangeSchema,
    baseDateRangeSchema
]).refine((data) => data.start <= data.end, {
    message: 'Tidsmaskinen er ikke opfundet endnu - slutdato skal være efter startdato'
}).refine((data) => (intervalToDuration(data).years ?? 0) < 1, {
    message: 'Wow, wow, lidt for meget planlægning - max et år ad gangen'
})


//z.object({
//start: dateSchema.pipe(z.date().describe('Startdato')),
//end: dateSchema.pipe(z.date().describe('Slutdato'))


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
