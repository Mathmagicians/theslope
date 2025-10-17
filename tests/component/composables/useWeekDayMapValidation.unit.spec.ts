import {describe, it, expect} from 'vitest'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import {WEEKDAYS, createDefaultWeekdayMap, createWeekDayMapFromSelection} from '~/types/dateTypes'

describe('useWeekDayMapValidation', () => {
    const {
        WeekDayMapSchema,
        WeekDayMapSchemaRequired,
        WeekDayMapSchemaOptional,
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

        it('should deserialize "[]" (empty array string) to null', () => {
            // When affinity is null, serialization may produce "[]" string
            const deserialized = deserializeWeekDayMap("[]")
            expect(deserialized).toBeNull()
        })
    })
})