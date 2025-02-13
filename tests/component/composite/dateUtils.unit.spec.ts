import {describe, expect, test, it} from "vitest"
import {calculateDayFromWeekNumber  } from "~/composables/utils"

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
