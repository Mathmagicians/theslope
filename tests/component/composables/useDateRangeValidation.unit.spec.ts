import { describe, it, expect } from 'vitest'
import { dateRangeSchema, stringDateRangeSchema, validateDateRange } from '~/composables/useDateRangeValidation'
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

    describe('dateRangeSchema - refinements', () => {
        it('should accept valid date range', () => {
            const result = dateRangeSchema.safeParse({ start: testDate, end: endDate })
            expect(result.success).toBe(true)
        })

        it('should reject range where end is before start', () => {
            const result = dateRangeSchema.safeParse({ start: endDate, end: testDate })
            expect(result.success).toBe(false)
            if (!result.success) {
                const errors = mapZodErrorsToFormErrors(result.error)
                const errorMessage = errors.get('_')?.[0] || ''
                expect(errorMessage.toLowerCase()).toContain('tidsmaskinen')
            }
        })

        it('should reject range longer than one year', () => {
            const twoYearsLater = new Date(2027, 0, 1)
            const result = dateRangeSchema.safeParse({ start: testDate, end: twoYearsLater })
            expect(result.success).toBe(false)
            if (!result.success) {
                const errors = mapZodErrorsToFormErrors(result.error)
                const errorMessage = errors.get('_')?.[0] || ''
                expect(errorMessage.toLowerCase()).toContain('max et år')
            }
        })

        it('should accept range exactly one year minus one day', () => {
            const oneYearLater = new Date(2025, 11, 31)
            const result = dateRangeSchema.safeParse({ start: testDate, end: oneYearLater })
            expect(result.success).toBe(true)
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
            expect(result.errors.has('_')).toBe(true)
        })
    })
})