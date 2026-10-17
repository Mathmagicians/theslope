import {describe, it, expect} from 'vitest'
import {createDefaultWeekdayMap} from '~/types/dateTypes'

describe('dateTypes - WeekDayMap factory functions', () => {
    describe('createDefaultWeekdayMap', () => {
        it.each([
            {
                description: 'one value - all days true',
                input: true,
                expected: { mandag: true, tirsdag: true, onsdag: true, torsdag: true, fredag: true, lørdag: true, søndag: true }
            },
            {
                description: 'no value - all days false',
                input: undefined,
                expected: { mandag: false, tirsdag: false, onsdag: false, torsdag: false, fredag: false, lørdag: false, søndag: false }
            },
            {
                description: 'a short array - first 4 days true, the rest false',
                input: [true, true, true, true],
                expected: { mandag: true, tirsdag: true, onsdag: true, torsdag: true, fredag: false, lørdag: false, søndag: false }
            }
        ])('should create map with $description', ({ input, expected }) => {
            expect(createDefaultWeekdayMap(input)).toEqual(expected)
        })
    })
})
