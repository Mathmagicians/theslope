import {describe, expect, it} from "vitest"
import {
    calculateDayFromWeekNumber,
    copyPartialDateRange,
    eachDayOfManyIntervals,
    getEachDayOfIntervalWithSelectedWeekdays,
    isDateRangeInside,
    createDateRange,
    formatDateRange,
    parseDate,
    excludeDatesFromInterval,
    areRangesOverlapping,
    selectWeekNumbersFromListThatFitInsideDateRange,
    formatCalendarDate
} from "~/utils/date"
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import {isValid} from "date-fns"
import type {DateRange} from "~/types/dateTypes"
import {CalendarDate} from '@internationalized/date'

const {createDefaultWeekdayMap} = useWeekDayMapValidation()

describe('test calculateDayFromWeekNumber', async () => {

    const testData = [
        {
            weekday: 0,
            weekNumber: 1,
            year: 2025,
            expected: new Date(2024, 11, 30)
        },
        {
            weekday: 0,
            weekNumber: 42,
            year: 2025,
            expected: new Date(2025, 9, 13)
        },
        {
            weekday: 4,
            weekNumber: 42,
            year: 2025,
            expected: new Date(2025, 9, 17)
        },
        {
            weekday: 6,
            weekNumber: 52,
            year: 2025,
            expected: new Date(2025, 11, 28)
        }
    ]
    testData.forEach((data) => {
        it("should return a date in the right week and year " + data.expected.toLocaleDateString('da'), async () => {
            const res = calculateDayFromWeekNumber(data.weekday, data.weekNumber, data.year)
            expect(res).toBeInstanceOf(Date)
            expect(res).toStrictEqual(data.expected)
        })
    })

})

describe('getEachDayOfIntervalWithSelectedWeekdays', () => {
    it('should return correct Mondays in January 2025', () => {
        const start = new Date(2025, 0, 1)  // January 1, 2025
        const end = new Date(2025, 0, 31)   // January 31, 2025
        const weekdays = createDefaultWeekdayMap([true]) // Only Monday selected

        const result = getEachDayOfIntervalWithSelectedWeekdays(start, end, weekdays)

        expect(result).toHaveLength(4) // 4 Mondays in January 2025
        // Verify each date is a Monday
        result.forEach(date => {
            expect(date.getDay()).toBe(1) // 1 = Monday in getDay()
        })
    })

    it('should return empty array when start is after end', () => {
        const start = new Date(2025, 0, 1)
        const end = new Date(2024, 0, 1)
        const weekdays = createDefaultWeekdayMap([false, true])

        const result = getEachDayOfIntervalWithSelectedWeekdays(start, end, weekdays)

        expect(result).toHaveLength(0)
    })

    it('should return empty array for single Monday when only Tuesday is selected', () => {
        const start = new Date(2025, 0, 6)  // First Monday of January 2025
        const end = new Date(2025, 0, 6)
        const weekdays = createDefaultWeekdayMap([false, true]) // Only Tuesday selected

        const result = getEachDayOfIntervalWithSelectedWeekdays(start, end, weekdays)

        expect(result).toHaveLength(0)
    })
})

describe('eachDayOfManyIntervals', () => {
    it('should return all days from multiple intervals', () => {
        const intervals = [
            {start: new Date(2025, 0, 1), end: new Date(2025, 0, 3)},
            {start: new Date(2025, 0, 5), end: new Date(2025, 0, 6)}
        ]
        const result = eachDayOfManyIntervals(intervals)
        expect(result).toHaveLength(5)
    })
})

describe('excludeDatesFromInterval', () => {
    it('should exclude holidays from dinner days', () => {
        const dinnerDays = [
            new Date(2025, 0, 6),  // Monday
            new Date(2025, 0, 13), // Monday
            new Date(2025, 0, 20)  // Monday
        ]

        const holidays = [
            {start: new Date(2025, 0, 13), end: new Date(2025, 0, 14)} // Excludes second Monday
        ]

        const result = excludeDatesFromInterval(dinnerDays, holidays)

        expect(result).toHaveLength(2)
        expect(result).toEqual([
            new Date(2025, 0, 6),
            new Date(2025, 0, 20)
        ])
    })
})

describe('parseDate works for dd-MM-yyyy format', () => {

    it('should parse "26/01/2025" to January 26, 2025', () => {
        const result = parseDate('26/01/2025')
        expect(result).toBeInstanceOf(Date)
        expect(isValid(result)).toBe(true)
        expect(result.getDate()).toBe(26)
        expect(result.getMonth()).toBe(0) // 0 = January
        expect(result.getFullYear()).toBe(2025)
    })

    it('should parse "20/12/2025" to December 20, 2025', () => {
        const result = parseDate('20/12/2025')
        expect(result).toBeInstanceOf(Date)
        expect(isValid(result)).toBe(true)
        expect(result.getDate()).toBe(20)
        expect(result.getMonth()).toBe(11) // 0 = January
        expect(result.getFullYear()).toBe(2025)
    })

    it('should parse "12-20-2025" as invalid date', () => {
        const invalidDate = parseDate('2-1-2025')
        expect(isValid(invalidDate)).toBe(false)
        expect(invalidDate).toBeInstanceOf(Date)
        expect(invalidDate.getTime()).toBeNaN()

    })

    it('should parse "2-1-2025" as invalid date', () => {
        const invalidDate = parseDate('2-1-2025')
        expect(isValid(invalidDate)).toBe(false)
        expect(invalidDate).toBeInstanceOf(Date)
        expect(invalidDate.getTime()).toBeNaN()

    })
})

describe('copyPartialDateRange', () => {
    it('should preserve date values in the copy', () => {
        const original = {
            start: new Date(2024, 5, 15),
            end: new Date(2024, 6, 30)
        }

        const copy = copyPartialDateRange(original)
        expect(copy).not.toBeNull()
        expect(copy).not.toBe(undefined)
        expect(copy).not.toBe(original)
        expect(copy?.start?.getTime()).toBe(original.start.getTime())
        expect(copy?.end?.getTime()).toBe(original.end.getTime())
    })
    it('should handle partially defined date range', () => {
        const undefinedRange = {
            start: new Date(2024, 5, 15),
            end: undefined
        }

        const copy = copyPartialDateRange(undefinedRange)
        expect(copy).toEqual(undefinedRange)
        expect(copy).not.toBe(undefinedRange)
    })

})

describe('formatDateRange', () => {
    it('should format undefined range as ?->?', () => {
        const result = formatDateRange(undefined)
        expect(result).toBe('?->?')
    })

    it('should format date range correctly with default mask', () => {
        const range = {
            start: new Date(2024, 0, 1), // January 1, 2024
            end: new Date(2024, 11, 31)  // December 31, 2024
        }
        const result = formatDateRange(range)
        expect(result).toBe('01/01/2024-31/12/2024')
    })

    it('should format date range with custom mask', () => {
        const range = {
            start: new Date(2024, 0, 1),
            end: new Date(2024, 11, 31)
        }
        const result = formatDateRange(range, 'MM/yy')
        expect(result).toBe('01/24-12/24')
    })
})

describe('isDateRangeInside', () => {
    it('should return true when range is inside base range', () => {
        const base: DateRange = {
            start: parseDate('01/08/2024'),
            end: parseDate('25/06/2025')
        }
        const range: DateRange = {
            start: parseDate('26/01/2025'),
            end: parseDate('28/01/2025')
        }

        expect(isDateRangeInside(base, range)).toBe(true)
    })

    it('should return false when base range is smaller than test range', () => {
        const base: DateRange = {
            start: parseDate('26/01/2025'),
            end: parseDate('28/01/2025')
        }
        const range: DateRange = {
            start: parseDate('01/08/2024'),
            end: parseDate('25/06/2025')
        }

        expect(isDateRangeInside(base, range)).toBe(false)
    })
})

describe('areRangesOverlapping', () => {
    it('should return false for single range', () => {
        const single = [
            createDateRange(
                new Date(2025, 0, 1),  // Jan 1, 2025
                new Date(2025, 0, 5)   // Jan 5, 2025
            )
        ]
        expect(areRangesOverlapping(single)).toBe(false)
    })

    it('should return false when ranges do not overlap', () => {
        const ranges: DateRange[] = [
            createDateRange(
                new Date(2025, 0, 1),  // Jan 1, 2025
                new Date(2025, 0, 5)   // Jan 5, 2025
            ),
            createDateRange(
                new Date(2025, 0, 6),  // Jan 6, 2025
                new Date(2025, 0, 10)  // Jan 10, 2025
            )
        ]
        expect(areRangesOverlapping(ranges)).toBe(false)
        const range_of3 = [...ranges, createDateRange(
            new Date(2024, 0, 1),  // Jan 1, 2026
            new Date(2024, 0, 5))]  // Jan 5, 2026

        expect(areRangesOverlapping(range_of3)).toBe(false)
    })

    it('should return true when ranges overlap', () => {
        const ranges: DateRange[] = [
            createDateRange(
                new Date(2025, 0, 1),  // Jan 1, 2025
                new Date(2025, 0, 7)   // Jan 7, 2025
            ),
            createDateRange(
                new Date(2025, 0, 6),  // Jan 6, 2025
                new Date(2025, 0, 10)  // Jan 10, 2025
            )
        ]
        expect(areRangesOverlapping(ranges)).toBe(true)

        const range_of3 = [...ranges, createDateRange(
            new Date(2024, 0, 1),
            new Date(2024, 0, 5))]
        expect(areRangesOverlapping(range_of3)).toBe(true)
        expect(areRangesOverlapping(range_of3.reverse())).toBe(true)
    })

    it('should detect duplicate ranges as overlapping', () => {
        const ranges: DateRange[] = [
            createDateRange(
                new Date(2025, 0, 1),  // Jan 1, 2025
                new Date(2025, 0, 5)   // Jan 5, 2025
            ),
            createDateRange(
                new Date(2025, 0, 1),  // Jan 1, 2025 (identical to first range)
                new Date(2025, 0, 5)   // Jan 5, 2025 (identical to first range)
            )
        ]
        expect(areRangesOverlapping(ranges)).toBe(true)
    })
    it('should detect duplicate ranges of same day as overlapping', () => {
        const ranges: DateRange[] = [
            createDateRange(
                new Date(2025, 0, 1),  // Jan 1, 2025
                new Date(2025, 0, 1)   // Jan 5, 2025
            ),
            createDateRange(
                new Date(2025, 0, 1),  // Jan 1, 2025 (identical to first range)
                new Date(2025, 0, 1)   // Jan 5, 2025 (identical to first range)
            )
        ]
        expect(areRangesOverlapping(ranges)).toBe(true)
    })
})

describe('selectWeekNumbersFromListThatFitInsideDateRange', () => {
    const testCases = [
        {
            description: 'full production season (Aug 2025 - Jun 2026)',
            seasonDates: { start: new Date(2025, 7, 1), end: new Date(2026, 5, 30) },
            holidayWeeks: [8, 42, 52],
            expectedCount: 3
        },
        {
            description: 'short test season (7 days)',
            seasonDates: { start: new Date(2025, 8, 1), end: new Date(2025, 8, 7) },
            holidayWeeks: [8, 42, 52],
            expectedCount: 0
        },
        {
            description: 'partial season (Oct 2025 - Jan 2026, excludes week 8)',
            seasonDates: { start: new Date(2025, 9, 1), end: new Date(2026, 0, 31) },
            holidayWeeks: [8, 42, 52],
            expectedCount: 2
        },
        {
            description: 'year boundary (week 8 in next year)',
            seasonDates: { start: new Date(2025, 11, 1), end: new Date(2026, 2, 31) },
            holidayWeeks: [8, 52],
            expectedCount: 2
        },
        {
            description: 'no matching weeks',
            seasonDates: { start: new Date(2025, 0, 1), end: new Date(2025, 0, 31) },
            holidayWeeks: [42, 52],
            expectedCount: 0
        }
    ]

    testCases.forEach(({ description, seasonDates, holidayWeeks, expectedCount }) => {
        it(`should return ${expectedCount} holidays for ${description}`, () => {
            const result = selectWeekNumbersFromListThatFitInsideDateRange(seasonDates, holidayWeeks)
            expect(result).toHaveLength(expectedCount)

            // Verify each result is a full week (Monday-Sunday)
            result.forEach(holiday => {
                expect(holiday.start.getDay()).toBe(1) // Monday
                expect(holiday.end.getDay()).toBe(0)   // Sunday
            })
        })
    })
})

describe('formatCalendarDate', () => {
    const testCases = [
        { day: 5, month: 1, year: 2025, expected: '05/01/2025' },
        { day: 31, month: 12, year: 2024, expected: '31/12/2024' }
    ]

    testCases.forEach(({ day, month, year, expected }) => {
        it(`should format CalendarDate(${year}, ${month}, ${day}) as '${expected}'`, () => {
            const calendarDate = new CalendarDate(year, month, day)
            const result = formatCalendarDate(calendarDate)
            expect(result).toBe(expected)
        })
    })

    it('should use DD/MM/YYYY format consistently', () => {
        const calendarDate = new CalendarDate(2025, 3, 7) // March 7, 2025
        const result = formatCalendarDate(calendarDate)
        expect(result).toBe('07/03/2025')
    })
})
