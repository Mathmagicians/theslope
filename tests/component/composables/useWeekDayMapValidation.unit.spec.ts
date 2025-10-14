import {describe, it, expect} from 'vitest'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import {WEEKDAYS} from '~/types/dateTypes'

describe('useWeekDayMapValidation', () => {
    const {
        WeekDayMapSchema,
        WeekDayMapSchemaRequired,
        WeekDayMapSchemaOptional,
        createWeekDayMapFromSelection,
        createDefaultWeekdayMap,
        serializeWeekDayMap,
        deserializeWeekDayMap
    } = useWeekDayMapValidation()

    describe('WeekDayMapSchema', () => {
        const validMapTestCases = [
            { description: 'all 7 weekdays with mixed values', input: [true, false, true, false, true, false, true] },
            { description: 'all days false', input: false },
            { description: 'all days true', input: true }
        ]

        validMapTestCases.forEach(({ description, input }) => {
            it(`should validate map with ${description}`, () => {
                const validMap = createDefaultWeekdayMap(input)
                const result = WeekDayMapSchema.safeParse(validMap)
                expect(result.success).toBe(true)
            })
        })
    })

    describe('WeekDayMapSchemaRequired', () => {
        it('should accept map with at least one day selected', () => {
            const validMap = createDefaultWeekdayMap([true, false, false, false, false, false, false])
            const result = WeekDayMapSchemaRequired.safeParse(validMap)
            expect(result.success).toBe(true)
        })

        it('should reject map with no days selected', () => {
            const allFalse = createDefaultWeekdayMap(false)
            const result = WeekDayMapSchemaRequired.safeParse(allFalse)
            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.error.errors[0]?.message).toBe('Man skal lave mad mindst en dag om ugen')
            }
        })
    })

    describe('WeekDayMapSchemaOptional', () => {
        const optionalTestCases = [
            { description: 'no days selected', input: false },
            { description: 'days selected', input: [true, true, false, false, false, false, false] }
        ]

        optionalTestCases.forEach(({ description, input }) => {
            it(`should accept map with ${description}`, () => {
                const map = createDefaultWeekdayMap(input)
                const result = WeekDayMapSchemaOptional.safeParse(map)
                expect(result.success).toBe(true)
            })
        })
    })

    describe('createDefaultWeekdayMap', () => {
        const defaultMapTestCases = [
            {
                description: 'all days true',
                input: true,
                expected: { mandag: true, tirsdag: true, onsdag: true, torsdag: true, fredag: true, lørdag: true, søndag: true }
            },
            {
                description: 'all days false by default',
                input: undefined,
                expected: { mandag: false, tirsdag: false, onsdag: false, torsdag: false, fredag: false, lørdag: false, søndag: false }
            },
            {
                description: 'first 4 days true',
                input: [true, true, true, true],
                expected: { mandag: true, tirsdag: true, onsdag: true, torsdag: true, fredag: false, lørdag: false, søndag: false }
            }
        ]

        defaultMapTestCases.forEach(({ description, input, expected }) => {
            it(`should create map with ${description}`, () => {
                const result = input === undefined ? createDefaultWeekdayMap() : createDefaultWeekdayMap(input)
                expect(result).toEqual(expected)
            })
        })
    })

    describe('createWeekDayMapFromSelection', () => {
        it('should create map from selected weekdays', () => {
            const selectedDays = [WEEKDAYS[0], WEEKDAYS[2], WEEKDAYS[4]] // Monday, Wednesday, Friday
            const map = createWeekDayMapFromSelection(selectedDays)

            expect(map[WEEKDAYS[0]]).toBe(true)  // Monday
            expect(map[WEEKDAYS[1]]).toBe(false) // Tuesday
            expect(map[WEEKDAYS[2]]).toBe(true)  // Wednesday
            expect(map[WEEKDAYS[3]]).toBe(false) // Thursday
            expect(map[WEEKDAYS[4]]).toBe(true)  // Friday
            expect(map[WEEKDAYS[5]]).toBe(false) // Saturday
            expect(map[WEEKDAYS[6]]).toBe(false) // Sunday
        })

        it('should create map with false values when no days selected', () => {
            const map = createWeekDayMapFromSelection([])
            WEEKDAYS.forEach(day => {
                expect(map[day]).toBe(false)
            })
        })

        it('should create map with true values when all days selected', () => {
            const map = createWeekDayMapFromSelection(WEEKDAYS)
            WEEKDAYS.forEach(day => {
                expect(map[day]).toBe(true)
            })
        })

        it('should filter out invalid weekday strings', () => {
            const mixedInput = ['mandag', 'invalid', 'onsdag', '', 'fredag', 'notaday']
            const map = createWeekDayMapFromSelection(mixedInput)

            expect(map.mandag).toBe(true)
            expect(map.tirsdag).toBe(false)
            expect(map.onsdag).toBe(true)
            expect(map.torsdag).toBe(false)
            expect(map.fredag).toBe(true)
            expect(map.lørdag).toBe(false)
            expect(map.søndag).toBe(false)
        })
    })

    describe('serialization', () => {
        const serializationTestCases = [
            { description: 'mixed values', input: [true, false, true, false, true, false, true] },
            { description: 'all-false map', input: false },
            { description: 'all-true map', input: true }
        ]

        serializationTestCases.forEach(({ description, input }) => {
            it(`should handle ${description}`, () => {
                const original = createDefaultWeekdayMap(input)
                const serialized = serializeWeekDayMap(original)

                expect(typeof serialized).toBe('string')

                const deserialized = deserializeWeekDayMap(serialized)
                expect(deserialized).toEqual(original)
            })
        })

        it('should roundtrip through serialization and validation', () => {
            const selectedDays = [WEEKDAYS[1], WEEKDAYS[3], WEEKDAYS[5]] // Tuesday, Thursday, Saturday
            const original = createWeekDayMapFromSelection(selectedDays)

            const serialized = serializeWeekDayMap(original)
            expect(typeof serialized).toBe('string')

            const deserialized = deserializeWeekDayMap(serialized)

            const validationResult = WeekDayMapSchemaRequired.safeParse(deserialized)
            expect(validationResult.success).toBe(true)

            if (validationResult.success) {
                expect(validationResult.data).toEqual(original)
            }
        })
    })
})