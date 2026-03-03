import { describe, it, expect } from 'vitest'
import { dateRangeSchema, nullableEndDateRangeSchema, createDateRangeSchema, stringDateRangeSchema, validateDateRange } from '~/composables/useDateRangeValidation'
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

    describe('stringDateRangeSchema - valid formats', () => {
        it.each([
            { format: 'ISO strings', start: '2025-01-01T00:00:00.000Z', end: '2025-01-07T00:00:00.000Z' },
            { format: 'dd/MM/yyyy strings', start: '01/01/2025', end: '07/01/2025' },
            { format: 'single-digit dates', start: '1/1/2025', end: '7/1/2025' },
            { format: 'Date objects', start: testDate, end: endDate },
            { format: 'mixed ISO and dd/MM/yyyy', start: '2025-01-01T00:00:00.000Z', end: '07/01/2025' },
            { format: 'mixed Date and string', start: testDate, end: '07/01/2025' }
        ])('should accept $format', ({ start, end }) => {
            const result = stringDateRangeSchema.safeParse({ start, end })
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.start).toBeInstanceOf(Date)
                expect(result.data.end).toBeInstanceOf(Date)
                expect(result.data.start.getFullYear()).toBe(2025)
            }
        })
    })

    describe('stringDateRangeSchema - invalid inputs', () => {
        it.each([
            { format: 'invalid string', start: 'not-a-date', end: '07/01/2025' },
            { format: 'wrong ISO format', start: '2025-01-01', end: '07/01/2025' },
            { format: 'number', start: 12345, end: endDate },
            { format: 'null', start: null, end: endDate },
            { format: 'undefined', start: undefined, end: endDate }
        ])('should reject $format', ({ start, end }) => {
            const result = stringDateRangeSchema.safeParse({ start, end })
            expect(result.success).toBe(false)
        })
    })

    // Shared refinements tested across all schema variants
    const allSchemas = [
        { name: 'dateRangeSchema', schema: dateRangeSchema },
        { name: 'nullableEndDateRangeSchema', schema: nullableEndDateRangeSchema },
        { name: 'createDateRangeSchema()', schema: createDateRangeSchema() }
    ] as const

    describe.each(allSchemas)('$name - shared refinements', ({ schema }) => {
        it('should accept valid date range', () => {
            expect(schema.safeParse({ start: testDate, end: endDate }).success).toBe(true)
        })

        it('should reject end before start', () => {
            const result = schema.safeParse({ start: endDate, end: testDate })
            expect(result.success).toBe(false)
            if (!result.success) {
                const errors = mapZodErrorsToFormErrors(result.error)
                expect((errors.get('_')?.[0] || '').toLowerCase()).toContain('tidsmaskinen')
            }
        })

        it.each([
            { format: 'ISO string', end: '2025-01-07T00:00:00.000Z' },
            { format: 'dd/MM/yyyy string', end: '07/01/2025' },
            { format: 'Date object', end: endDate }
        ])('should accept $format for end date', ({ end }) => {
            expect(schema.safeParse({ start: testDate, end }).success).toBe(true)
        })
    })

    // maxOneYear: only dateRangeSchema and factory with maxOneYear: true
    describe.each([
        { name: 'dateRangeSchema', schema: dateRangeSchema },
        { name: 'createDateRangeSchema({ maxOneYear: true })', schema: createDateRangeSchema({ maxOneYear: true }) }
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

    // No maxOneYear: nullableEndDateRangeSchema and default factory
    describe.each([
        { name: 'nullableEndDateRangeSchema', schema: nullableEndDateRangeSchema },
        { name: 'createDateRangeSchema()', schema: createDateRangeSchema() }
    ])('$name - no maxOneYear', ({ schema }) => {
        it('should accept range longer than one year', () => {
            expect(schema.safeParse({ start: testDate, end: twoYearsLater }).success).toBe(true)
        })
    })

    // Nullable end: only nullableEndDateRangeSchema and factory with nullableEnd: true
    describe.each([
        { name: 'nullableEndDateRangeSchema', schema: nullableEndDateRangeSchema },
        { name: 'createDateRangeSchema({ nullableEnd: true })', schema: createDateRangeSchema({ nullableEnd: true }) }
    ])('$name - nullable end', ({ schema }) => {
        it('should accept null end', () => {
            const result = schema.safeParse({ start: testDate, end: null })
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.end).toBeNull()
            }
        })
    })

    // Non-nullable end: dateRangeSchema and default factory
    describe.each([
        { name: 'dateRangeSchema', schema: dateRangeSchema },
        { name: 'createDateRangeSchema()', schema: createDateRangeSchema() }
    ])('$name - non-nullable end', ({ schema }) => {
        it('should reject null end', () => {
            expect(schema.safeParse({ start: testDate, end: null }).success).toBe(false)
        })
    })

    describe('createDateRangeSchema - combined options', () => {
        it('should support nullableEnd + maxOneYear together', () => {
            const schema = createDateRangeSchema({ nullableEnd: true, maxOneYear: true })
            expect(schema.safeParse({ start: testDate, end: null }).success).toBe(true)
            expect(schema.safeParse({ start: testDate, end: endDate }).success).toBe(true)
            expect(schema.safeParse({ start: testDate, end: twoYearsLater }).success).toBe(false)
        })
    })

    describe('validateDateRange helper', () => {
        it('should return valid result for valid range', () => {
            const result = validateDateRange({ start: '01/01/2025', end: '07/01/2025' })
            expect(result.isValid).toBe(true)
            expect(result.range).toBeDefined()
            expect(result.errors.size).toBe(0)
        })

        it('should return errors for invalid range', () => {
            const result = validateDateRange({ start: 'invalid-date', end: '07/01/2025' })
            expect(result.isValid).toBe(false)
            expect(result.range).toBeUndefined()
            expect(result.errors.size).toBeGreaterThan(0)
        })

        it('should map errors to field paths', () => {
            const result = validateDateRange({ start: 'invalid', end: 'also-invalid' })
            expect(result.isValid).toBe(false)
            expect(result.errors.size).toBeGreaterThan(0)
        })
    })
})
