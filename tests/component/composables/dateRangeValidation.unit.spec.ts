// The dateRangeSchema itself is useDateRangeValidation.unit.spec.ts' subject
import {describe, it, expect} from 'vitest'
import {createDateRange, compareDateRanges} from '~/utils/date'

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
