import {describe, expect, it, vi, beforeEach, afterEach} from "vitest"
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
    formatCalendarDate,
    calculateAgeOnDate,
    calculateAge,
    toCalendarDate,
    toDate,
    calculateCountdown,
    getWeekdayFromDate,
    DATE_SETTINGS
} from "~/utils/date"
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import {isValid, isSameDay} from "date-fns"
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
    describe('timezone-agnostic behavior (CI=UTC, local=Copenhagen)', () => {
        const testCases = [
            { day: 5, month: 1, year: 2025, expected: '05/01/2025' },
            { day: 31, month: 12, year: 2024, expected: '31/12/2024' },
            { day: 7, month: 3, year: 2025, expected: '07/03/2025' }
        ]

        testCases.forEach(({ day, month, year, expected }) => {
            it(`GIVEN Date created in UTC (CI server) ${year}-${month}-${day} WHEN formatting via CalendarDate THEN returns '${expected}'`, () => {
                // Simulate CI server: create Date in UTC timezone
                const utcDate = new Date(Date.UTC(year, month - 1, day))

                // Convert to CalendarDate and format
                const calendarDate = toCalendarDate(utcDate)!
                const result = formatCalendarDate(calendarDate)

                // Must match expected regardless of server timezone
                expect(result).toBe(expected)
            })
        })
    })
})

describe('calculateAgeOnDate', () => {
    const testCases = [
        {
            description: 'birthday has not occurred yet this year',
            birthDate: new Date(2010, 2, 15), // March 15, 2010
            eventDate: new Date(2025, 0, 1),  // January 1, 2025
            expectedAge: 14
        },
        {
            description: 'birthday has already occurred this year',
            birthDate: new Date(2010, 2, 15), // March 15, 2010
            eventDate: new Date(2025, 11, 31), // December 31, 2025
            expectedAge: 15
        },
        {
            description: 'on exact birthday',
            birthDate: new Date(2010, 2, 15), // March 15, 2010
            eventDate: new Date(2025, 2, 15), // March 15, 2025
            expectedAge: 15
        },
        {
            description: 'newborn (age 0)',
            birthDate: new Date(2025, 0, 1),  // January 1, 2025
            eventDate: new Date(2025, 0, 15), // January 15, 2025
            expectedAge: 0
        },
        {
            description: 'leap year birthday in non-leap year',
            birthDate: new Date(2020, 1, 29), // February 29, 2020
            eventDate: new Date(2025, 2, 1),  // March 1, 2025
            expectedAge: 5
        },
        {
            description: 'adult before birthday',
            birthDate: new Date(1985, 4, 20), // May 20, 1985
            eventDate: new Date(2025, 0, 1),  // January 1, 2025
            expectedAge: 39
        },
        {
            description: 'same date (age 0)',
            birthDate: new Date(2025, 5, 15),
            eventDate: new Date(2025, 5, 15),
            expectedAge: 0
        },
        {
            description: '2-year-old boundary: day before birthday (still 1)',
            birthDate: new Date(2023, 0, 1),  // January 1, 2023
            eventDate: new Date(2024, 11, 31), // December 31, 2024
            expectedAge: 1
        },
        {
            description: '2-year-old boundary: on birthday (turns 2)',
            birthDate: new Date(2023, 0, 1),  // January 1, 2023
            eventDate: new Date(2025, 0, 1),  // January 1, 2025
            expectedAge: 2
        },
        {
            description: '12-year-old boundary: day before birthday (still 11)',
            birthDate: new Date(2013, 5, 15), // June 15, 2013
            eventDate: new Date(2025, 5, 14), // June 14, 2025
            expectedAge: 11
        },
        {
            description: '12-year-old boundary: on birthday (turns 12)',
            birthDate: new Date(2013, 5, 15), // June 15, 2013
            eventDate: new Date(2025, 5, 15), // June 15, 2025
            expectedAge: 12
        }
    ]

    testCases.forEach(({ description, birthDate, eventDate, expectedAge }) => {
        it(`should calculate age correctly when ${description}`, () => {
            const age = calculateAgeOnDate(birthDate, eventDate)
            expect(age).toBe(expectedAge)
        })
    })
})

describe('calculateAge', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date(2025, 0, 15)) // January 15, 2025
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    const testCases = [
        { description: 'Date object before birthday', input: new Date(2010, 2, 15), expected: 14 },
        { description: 'ISO string before birthday', input: '2010-03-15T00:00:00.000Z', expected: 14 },
        { description: 'child under 18', input: new Date(2015, 0, 1), expected: 10 },
        { description: 'adult over 18', input: new Date(1985, 5, 20), expected: 39 },
        { description: 'null input', input: null, expected: null },
        { description: 'invalid date string', input: 'invalid-date', expected: null }
    ]

    testCases.forEach(({ description, input, expected }) => {
        it(`should handle ${description}`, () => {
            const age = calculateAge(input)
            expect(age).toBe(expected)
        })
    })

    it('should calculate correctly after birthday this year', () => {
        vi.setSystemTime(new Date(2025, 11, 31)) // December 31, 2025
        const age = calculateAge(new Date(2010, 2, 15))
        expect(age).toBe(15)
    })
})

describe('toCalendarDate roundtrip conversions', () => {
    // Shared test dates for DRY - each entry has both representations
    const sharedTestDates = [
        { description: 'first day of month', date: new Date(2025, 0, 1), year: 2025, month: 1, day: 1 },
        { description: 'last day of month (31 days)', date: new Date(2025, 11, 31), year: 2025, month: 12, day: 31 },
        { description: 'February non-leap year', date: new Date(2025, 1, 28), year: 2025, month: 2, day: 28 },
        { description: 'February leap year', date: new Date(2024, 1, 29), year: 2024, month: 2, day: 29 },
        { description: 'year boundary - first day', date: new Date(2025, 0, 1), year: 2025, month: 1, day: 1 },
        { description: 'year boundary - last day', date: new Date(2025, 11, 31), year: 2025, month: 12, day: 31 }
    ]

    describe('Date → CalendarDate → Date roundtrip', () => {
        sharedTestDates.forEach(({ description, date }) => {
            it(`GIVEN ${description} WHEN converting Date→CalendarDate→Date THEN dates match using isSameDay`, () => {
                const calendarDate = toCalendarDate(date)
                expect(calendarDate).toBeDefined()

                const roundtripDate = toDate(calendarDate!)

                expect(isSameDay(date, roundtripDate)).toBe(true)
            })
        })
    })

    describe('CalendarDate → Date → CalendarDate roundtrip', () => {
        sharedTestDates.forEach(({ description, year, month, day }) => {
            it(`GIVEN ${description} WHEN converting CalendarDate→Date→CalendarDate THEN CalendarDates match`, () => {
                const originalCalendarDate = new CalendarDate(year, month, day)
                const date = toDate(originalCalendarDate)
                const roundtripCalendarDate = toCalendarDate(date)

                expect(roundtripCalendarDate).toBeDefined()
                expect(roundtripCalendarDate!.year).toBe(originalCalendarDate.year)
                expect(roundtripCalendarDate!.month).toBe(originalCalendarDate.month)
                expect(roundtripCalendarDate!.day).toBe(originalCalendarDate.day)
            })
        })
    })

    describe('timezone-agnostic behavior (CI=UTC, local=Copenhagen)', () => {
        const timezoneTestCases = [
            { description: 'summer date', year: 2025, month: 6, day: 15 },
            { description: 'year boundary Dec 31', year: 2025, month: 12, day: 31 },
            { description: 'year boundary Jan 1', year: 2025, month: 1, day: 1 }
        ]

        timezoneTestCases.forEach(({ description, year, month, day }) => {
            it(`GIVEN CalendarDate ${description} WHEN converting via toDate THEN Date extracts correctly in both UTC and Copenhagen`, () => {
                const calendarDate = new CalendarDate(year, month, day)
                const date = toDate(calendarDate)

                // Extract in Copenhagen timezone (what we configured)
                const partsInCopenhagen = new Intl.DateTimeFormat('en-US', {
                    timeZone: DATE_SETTINGS.timezone,
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric'
                }).formatToParts(date)

                const copenhagenYear = Number(partsInCopenhagen.find(p => p.type === 'year')!.value)
                const copenhagenMonth = Number(partsInCopenhagen.find(p => p.type === 'month')!.value)
                const copenhagenDay = Number(partsInCopenhagen.find(p => p.type === 'day')!.value)

                // Must match the CalendarDate we started with
                expect(copenhagenYear).toBe(year)
                expect(copenhagenMonth).toBe(month)
                expect(copenhagenDay).toBe(day)

                // Extract in UTC timezone
                const partsInUTC = new Intl.DateTimeFormat('en-US', {
                    timeZone: 'UTC',
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric'
                }).formatToParts(date)

                const utcYear = Number(partsInUTC.find(p => p.type === 'year')!.value)
                const utcMonth = Number(partsInUTC.find(p => p.type === 'month')!.value)
                const utcDay = Number(partsInUTC.find(p => p.type === 'day')!.value)

                // Should ALSO match because toDate sets noon Copenhagen, which never crosses UTC day boundary
                expect(utcYear).toBe(year)
                expect(utcMonth).toBe(month)
                expect(utcDay).toBe(day)
            })
        })

        it('GIVEN Date created in local timezone WHEN doing roundtrip THEN isSameDay returns true', () => {
            const localDate = new Date(2025, 5, 15)
            const calendarDate = toCalendarDate(localDate)
            const roundtripDate = toDate(calendarDate!)

            expect(isSameDay(localDate, roundtripDate)).toBe(true)
        })
    })

    describe('edge cases', () => {
        it('GIVEN undefined date WHEN converting to CalendarDate THEN returns undefined', () => {
            const result = toCalendarDate(undefined)
            expect(result).toBeUndefined()
        })

        it('GIVEN invalid date WHEN converting to CalendarDate THEN returns undefined', () => {
            const invalidDate = new Date('invalid')
            const result = toCalendarDate(invalidDate)
            expect(result).toBeUndefined()
        })
    })

    describe('month index conversion', () => {
        const monthTestCases = [
            { description: 'January', jsMonth: 0, calendarMonth: 1 },
            { description: 'December', jsMonth: 11, calendarMonth: 12 }
        ]

        monthTestCases.forEach(({ description, jsMonth, calendarMonth }) => {
            it(`GIVEN ${description} (JS month ${jsMonth}) WHEN converting to CalendarDate THEN month is ${calendarMonth}`, () => {
                const date = new Date(2025, jsMonth, 15)
                const calendarDate = toCalendarDate(date)

                expect(calendarDate!.month).toBe(calendarMonth)
            })

            it(`GIVEN CalendarDate month ${calendarMonth} WHEN converting to Date THEN JS month is ${jsMonth}`, () => {
                const calendarDate = new CalendarDate(2025, calendarMonth, 15)
                const date = toDate(calendarDate)

                expect(date.getMonth()).toBe(jsMonth)
            })
        })
    })
})

describe('calculateCountdown', () => {
    const testCases = [
        {
            description: 'target is 2 hours and 30 minutes away',
            currentDate: new Date(2025, 0, 15, 16, 0, 0),
            targetDate: new Date(2025, 0, 15, 18, 30, 0),
            expectedHours: 2,
            expectedMinutes: 30,
            expectedFormatted: '2T 30M'
        },
        {
            description: 'target is exactly 1 hour away',
            currentDate: new Date(2025, 0, 15, 17, 0, 0),
            targetDate: new Date(2025, 0, 15, 18, 0, 0),
            expectedHours: 1,
            expectedMinutes: 0,
            expectedFormatted: '1T 0M'
        },
        {
            description: 'target is 45 minutes away (less than 1 hour)',
            currentDate: new Date(2025, 0, 15, 17, 15, 0),
            targetDate: new Date(2025, 0, 15, 18, 0, 0),
            expectedHours: 0,
            expectedMinutes: 45,
            expectedFormatted: '45M'
        },
        {
            description: 'target is 5 minutes away',
            currentDate: new Date(2025, 0, 15, 17, 55, 0),
            targetDate: new Date(2025, 0, 15, 18, 0, 0),
            expectedHours: 0,
            expectedMinutes: 5,
            expectedFormatted: '5M'
        },
        {
            description: 'target is exactly now (same time)',
            currentDate: new Date(2025, 0, 15, 18, 0, 0),
            targetDate: new Date(2025, 0, 15, 18, 0, 0),
            expectedHours: 0,
            expectedMinutes: 0,
            expectedFormatted: 'NU'
        },
        {
            description: 'target is in the past',
            currentDate: new Date(2025, 0, 15, 19, 0, 0),
            targetDate: new Date(2025, 0, 15, 18, 0, 0),
            expectedHours: 0,
            expectedMinutes: 0,
            expectedFormatted: 'NU'
        },
        {
            description: 'target is 10 hours away',
            currentDate: new Date(2025, 0, 15, 8, 0, 0),
            targetDate: new Date(2025, 0, 15, 18, 0, 0),
            expectedHours: 10,
            expectedMinutes: 0,
            expectedFormatted: '10T 0M'
        },
        {
            description: 'target crosses midnight',
            currentDate: new Date(2025, 0, 15, 23, 30, 0),
            targetDate: new Date(2025, 0, 16, 1, 15, 0),
            expectedHours: 1,
            expectedMinutes: 45,
            expectedFormatted: '1T 45M'
        }
    ]

    testCases.forEach(({ description, currentDate, targetDate, expectedHours, expectedMinutes, expectedFormatted }) => {
        it(`should calculate countdown correctly when ${description}`, () => {
            const result = calculateCountdown(targetDate, currentDate)

            expect(result.hours).toBe(expectedHours)
            expect(result.minutes).toBe(expectedMinutes)
            expect(result.formatted).toBe(expectedFormatted)
        })
    })
})
