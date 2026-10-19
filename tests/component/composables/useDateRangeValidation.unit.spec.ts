import { describe, it, expect } from 'vitest'
import { dateRangeSchema, nullableEndDateRangeSchema } from '~/composables/useDateRangeValidation'
import { mapZodErrorsToFormErrors } from '~/utils/validtation'

/**
 * Unit tests for useDateRangeValidation composable
 * Tests the three-way union date schema supporting:
 * - ISO strings (HTTP JSON transport)
 * - dd/MM/yyyy strings (UI forms)
 * - Date objects (domain layer)
 */
describe('useDateRangeValidation', () => {
    const testDate = new Date(2025, 0, 1) // Jan 1, 2025
    const endDate = new Date(2025, 0, 7) // Jan 7, 2025
    const twoYearsLater = new Date(2027, 0, 1)

    describe('dateRangeSchema - accepted date formats (the dateSchema union)', () => {
        it.each([
            { format: 'ISO strings', start: '2025-01-01T00:00:00.000Z', end: '2025-01-07T00:00:00.000Z' },
            { format: 'dd/MM/yyyy strings', start: '01/01/2025', end: '07/01/2025' },
            { format: 'single-digit dates', start: '1/1/2025', end: '7/1/2025' },
            { format: 'Date objects', start: testDate, end: endDate }
        ])('should accept $format', ({ start, end }) => {
            const result = dateRangeSchema.safeParse({ start, end })
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.start).toBeInstanceOf(Date)
                expect(result.data.end).toBeInstanceOf(Date)
                expect(result.data.start.getFullYear()).toBe(2025)
            }
        })
    })

    describe('dateRangeSchema - rejected date inputs', () => {
        it.each([
            { format: 'invalid string', start: 'not-a-date', end: '07/01/2025' },
            { format: 'wrong ISO format', start: '2025-01-01', end: '07/01/2025' }
        ])('should reject $format', ({ start, end }) => {
            const result = dateRangeSchema.safeParse({ start, end })
            expect(result.success).toBe(false)
        })
    })

    // Each schema carries its own end-after-start refinement
    it.each([
        { name: 'dateRangeSchema', schema: dateRangeSchema },
        { name: 'nullableEndDateRangeSchema', schema: nullableEndDateRangeSchema }
    ] as const)('$name should reject end before start', ({ schema }) => {
        const result = schema.safeParse({ start: endDate, end: testDate })
        expect(result.success).toBe(false)
        if (!result.success) {
            const errors = mapZodErrorsToFormErrors(result.error)
            expect((errors.get('_')?.[0] || '').toLowerCase()).toContain('tidsmaskinen')
        }
    })

    // maxOneYear: only dateRangeSchema
    describe.each([
        { name: 'dateRangeSchema', schema: dateRangeSchema }
    ])('$name - maxOneYear refinement', ({ schema }) => {
        it('should reject range longer than one year', () => {
            const result = schema.safeParse({ start: testDate, end: twoYearsLater })
            expect(result.success).toBe(false)
            if (!result.success) {
                const errors = mapZodErrorsToFormErrors(result.error)
                expect((errors.get('_')?.[0] || '').toLowerCase()).toContain('max et år')
            }
        })

        it('should accept range exactly one year minus one day', () => {
            expect(schema.safeParse({ start: testDate, end: new Date(2025, 11, 31) }).success).toBe(true)
        })
    })

    // No maxOneYear: nullableEndDateRangeSchema
    describe.each([
        { name: 'nullableEndDateRangeSchema', schema: nullableEndDateRangeSchema }
    ])('$name - no maxOneYear', ({ schema }) => {
        it('should accept range longer than one year', () => {
            expect(schema.safeParse({ start: testDate, end: twoYearsLater }).success).toBe(true)
        })
    })

    // Nullable end: only nullableEndDateRangeSchema
    describe.each([
        { name: 'nullableEndDateRangeSchema', schema: nullableEndDateRangeSchema }
    ])('$name - nullable end', ({ schema }) => {
        it.each([
            { input: null, desc: 'null' },
            { input: '', desc: 'empty string' }
        ])('should accept $desc end and parse to null', ({ input }) => {
            const result = schema.safeParse({ start: testDate, end: input })
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.end).toBeNull()
            }
        })
    })

    // Non-nullable end: dateRangeSchema
    describe.each([
        { name: 'dateRangeSchema', schema: dateRangeSchema }
    ])('$name - non-nullable end', ({ schema }) => {
        it('should reject null end', () => {
            expect(schema.safeParse({ start: testDate, end: null }).success).toBe(false)
        })
    })
})
