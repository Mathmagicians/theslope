import {describe, it, expect} from 'vitest'
import {createDefaultWeekdayMap} from '~/types/dateTypes'
import {DinnerMode} from '@prisma/client'

describe('dateTypes - WeekDayMap factory functions', () => {
    describe('createDefaultWeekdayMap - generic factory', () => {
        const defaultMapTestCases = [
            // Backward compatibility - no type parameter (defaults to boolean)
            {
                description: 'default (boolean) - all days true',
                input: true,
                expected: { mandag: true, tirsdag: true, onsdag: true, torsdag: true, fredag: true, lørdag: true, søndag: true }
            },
            {
                description: 'default (boolean) - all days false',
                input: undefined,
                expected: { mandag: false, tirsdag: false, onsdag: false, torsdag: false, fredag: false, lørdag: false, søndag: false }
            },
            {
                description: 'default (boolean) - first 4 days true',
                input: [true, true, true, true],
                expected: { mandag: true, tirsdag: true, onsdag: true, torsdag: true, fredag: false, lørdag: false, søndag: false }
            },
            // Explicit boolean type parameter
            {
                description: 'explicit boolean - all false',
                input: false,
                expected: { mandag: false, tirsdag: false, onsdag: false, torsdag: false, fredag: false, lørdag: false, søndag: false }
            },
            {
                description: 'explicit boolean - array with mixed',
                input: [true, false, true, false, true, false, true],
                expected: { mandag: true, tirsdag: false, onsdag: true, torsdag: false, fredag: true, lørdag: false, søndag: true }
            },
            // DinnerMode type parameter
            {
                description: 'DinnerMode - all DINEIN',
                input: DinnerMode.DINEIN,
                expected: {
                    mandag: DinnerMode.DINEIN,
                    tirsdag: DinnerMode.DINEIN,
                    onsdag: DinnerMode.DINEIN,
                    torsdag: DinnerMode.DINEIN,
                    fredag: DinnerMode.DINEIN,
                    lørdag: DinnerMode.DINEIN,
                    søndag: DinnerMode.DINEIN
                }
            },
            {
                description: 'DinnerMode - all NONE',
                input: DinnerMode.NONE,
                expected: {
                    mandag: DinnerMode.NONE,
                    tirsdag: DinnerMode.NONE,
                    onsdag: DinnerMode.NONE,
                    torsdag: DinnerMode.NONE,
                    fredag: DinnerMode.NONE,
                    lørdag: DinnerMode.NONE,
                    søndag: DinnerMode.NONE
                }
            },
            {
                description: 'DinnerMode - mixed preferences array',
                input: [
                    DinnerMode.DINEIN,
                    DinnerMode.TAKEAWAY,
                    DinnerMode.NONE,
                    DinnerMode.DINEIN,
                    DinnerMode.TAKEAWAY,
                    DinnerMode.NONE,
                    DinnerMode.DINEIN
                ],
                expected: {
                    mandag: DinnerMode.DINEIN,
                    tirsdag: DinnerMode.TAKEAWAY,
                    onsdag: DinnerMode.NONE,
                    torsdag: DinnerMode.DINEIN,
                    fredag: DinnerMode.TAKEAWAY,
                    lørdag: DinnerMode.NONE,
                    søndag: DinnerMode.DINEIN
                }
            }
        ]

        defaultMapTestCases.forEach(({ description, input, expected }) => {
            it(`should create map with ${description}`, () => {
                const result = input === undefined ? createDefaultWeekdayMap() : createDefaultWeekdayMap(input)
                expect(result).toEqual(expected)
            })
        })
    })
})