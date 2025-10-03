// tests/dateRangeValidation.test.ts
import {describe, it, expect, assertType} from 'vitest'
import {dateRangeSchema} from '~/composables/useDateRangeValidation'
import {parseDate, createDateRange, compareDateRanges} from '~/utils/date'
import type { DateRange} from '~/types/dateTypes'
import {intervalToDuration} from "date-fns"

describe('dateRangeSchema', () => {
    it('should safeParse the date range "25/01/2025" to "26/01/2025"', () => {
        const input = {
            start: '25/1/2025',
            end: '26/1/2025'
        }

        const result = dateRangeSchema.safeParse({
            start: input.start,
            end: input.end
        })

        expect(result.success).toBe(true)
        const data = result?.data as DateRange
        assertType<DateRange>(data)
        expect(data.start).toBeDefined()
        expect(data.end).toBeDefined()
        expect(data?.start).toEqual(parseDate('25/01/2025'))
        expect(data?.end).toEqual(parseDate('26/01/2025'))
        expect(data?.end.getDate()).toBe(26)
        expect(data?.end.getMonth()).toBe(0) // 0 = January
        expect(data?.end.getFullYear()).toBe(2025)
    })

    it('should return error on wrong formatted range "25-01-2025" to "26-01-2025"', () => {
        const input = {
            start: '25-1-2025',
            end: '26-1-2025'
        } as {start: string, end: string}

        const result = dateRangeSchema.safeParse(input)
        expect(result.success).toBe(false)
    })

    it('should return error on end date before start date', () => {
        const input = {
            start: '26/1/2025',
            end: '25/1/2025'
        }

        const result = dateRangeSchema.safeParse({
            start: input.start,
            end: input.end
        })

        expect(result.success).toBe(false)
        expect(result?.error?.format()._errors?.length).toBe(1)
        expect(result?.error?.format()._errors.some( (e) => e.startsWith('Tidsmaskinen er ikke opfundet'))).toBe(true)

    })

    it('should return error on range longer than a year', () => {
        expect(intervalToDuration({
                start: parseDate('26/01/2025'),
                end: parseDate('26/01/2025')
            }
        ).years ?? 0 <1).toBe(true)

        const input = {
            start: '26/01/2025',
            end: '27/01/2026'
        }

        const asDateRange = {
            start: parseDate(input.start),
            end: parseDate(input.end)
        }

        const duration = intervalToDuration(asDateRange)
        console.log('duration', duration)
        expect(duration.years ?? 0).toBe(1)
        expect((duration.years ?? 0) < 1).toBe(false)

        const result = dateRangeSchema.safeParse({
            start: input.start,
            end: input.end
        })

        expect(result.success).toBe(false)
        expect(result?.error?.format()._errors?.length).toBe(1)
        expect(result?.error?.format()._errors.some( (e) => e.startsWith('Wow, wow, lidt for meget planlægning'))).toBe(true)
    })

    it('should accept both Date objects and formatted strings', () => {
        const dateInput = {
            start: new Date(2025, 0, 25),
            end: new Date(2025, 0, 26)
        }

        const stringInput = {
            start: '25/01/2025',
            end: '26/01/2025'
        }

        // Test Date objects
        const dateResult = dateRangeSchema.safeParse(dateInput)
        expect(dateResult.success).toBe(true)
        if (dateResult.success) {
            expect(dateResult.data.start).toEqual(dateInput.start)
            expect(dateResult.data.end).toEqual(dateInput.end)
        }

        // Test formatted strings
        const stringResult = dateRangeSchema.safeParse(stringInput)
        expect(stringResult.success).toBe(true)
        if (stringResult.success) {
            expect(stringResult.data.start).toEqual(dateInput.start)
            expect(stringResult.data.end).toEqual(dateInput.end)
        }
    })
})

describe('compareDateRanges', () => {
    it('should sort date ranges by start date', () => {
        const range1 = createDateRange(
            new Date(2025, 0, 1),  // Jan 1, 2025
            new Date(2025, 0, 5)   // Jan 5, 2025
        )
        const range2 = createDateRange(
            new Date(2025, 0, 6),  // Jan 6, 2025
            new Date(2025, 0, 10)  // Jan 10, 2025
        )

        expect(compareDateRanges(range1, range2)).toBeLessThan(0)
        expect(compareDateRanges(range2, range1)).toBeGreaterThan(0)
    })

    it('should consider equal start dates as equal', () => {
        const range1 = createDateRange(
            new Date(2025, 0, 1),  // Jan 1, 2025
            new Date(2025, 0, 5)   // Jan 5, 2025
        )
        const range2 = createDateRange(
            new Date(2025, 0, 1),  // Jan 1, 2025
            new Date(2025, 0, 10)  // Jan 10, 2025
        )

        expect(compareDateRanges(range1, range2)).toBe(0)
    })
})
