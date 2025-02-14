import {describe, expect, test, it} from "vitest"
import {
    calculateDayFromWeekNumber,
    createDefaultWeekdayMap,
    eachDayOfManyIntervals,
    getEachDayOfIntervalWithSelectedWeekdays
} from "~/utils/date"

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
