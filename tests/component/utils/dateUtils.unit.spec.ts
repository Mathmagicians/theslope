import {describe, expect, test, it} from "vitest"
import {
    calculateDayFromWeekNumber,
    createDefaultWeekdayMap,
    eachDayOfManyIntervals,
    getEachDayOfIntervalWithSelectedWeekdays,
    copyDateRange
} from "~/utils/date"
import {isValid} from "date-fns"
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
        it("should return a date in the right week and year "+data.expected.toLocaleDateString('da'), async () => {
            const res = calculateDayFromWeekNumber(data.weekday, data.weekNumber, data.year)
            expect(res).toBeInstanceOf(Date)
            expect(res).toStrictEqual(data.expected)
        })
    })

})

describe('createDefaultWeekdayMap', () => {
    it('should create map with all days set to true', () => {
        const result = createDefaultWeekdayMap(true)

        expect(result).toEqual({
            mandag: true,
            tirsdag: true,
            onsdag: true,
            torsdag: true,
            fredag: true,
            loerdag: true,
            soendag: true
        })
    })

    it('should create map with first 4 days true', () => {
        const result = createDefaultWeekdayMap([true, true, true, true])

        expect(result).toEqual({
            mandag: true,
            tirsdag: true,
            onsdag: true,
            torsdag: true,
            fredag: false,
            loerdag: false,
            soendag: false
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
            { start: new Date(2025, 0, 1), end: new Date(2025, 0, 3) },
            { start: new Date(2025, 0, 5), end: new Date(2025, 0, 6) }
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
            { start: new Date(2025, 0, 13), end: new Date(2025, 0, 14) } // Excludes second Monday
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
        console.log("Parsed date", invalidDate)
        expect(isValid(invalidDate)).toBe(false)
        expect(invalidDate).toBeInstanceOf(Date)
        expect(invalidDate.getTime()).toBeNaN()

    })

    it('should parse "2-1-2025" as invalid date', () => {
        const invalidDate = parseDate('2-1-2025')
        console.log("Parsed date", invalidDate)
        expect(isValid(invalidDate)).toBe(false)
        expect(invalidDate).toBeInstanceOf(Date)
        expect(invalidDate.getTime()).toBeNaN()

    })
})

describe('copyDateRange', () => {
    it('should preserve date values in the copy', () => {
        const original = {
            start: new Date(2024, 5, 15),
            end: new Date(2024, 6, 30)
        }

        const copy = copyDateRange(original)

        expect(copy.start.getTime()).toBe(original.start.getTime())
        expect(copy.end.getTime()).toBe(original.end.getTime())
    })
    it('should handle undefined date range', () => {
        const undefinedRange = {
            start: undefined,
            end: undefined
        }

        const copy = copyDateRange(undefinedRange)
        expect(copy).toEqual(undefinedRange)
        expect(copy).not.toBe(undefinedRange)
    })

})
