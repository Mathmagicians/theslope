import {describe, it, expect} from 'vitest'
import {z} from 'zod'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import {WEEKDAYS} from '~/types/dateTypes'
import {DinnerModeSchema} from '~~/prisma/generated/zod'

const DinnerMode = DinnerModeSchema.enum

const selectionTestCases = [
    { desc: 'Mon, Wed, Fri', selectedDays: [WEEKDAYS[0], WEEKDAYS[2], WEEKDAYS[4]], expectedPattern: [true, false, true, false, true, false, false] },
    { desc: 'no days', selectedDays: [], expectedPattern: [false, false, false, false, false, false, false] },
    { desc: 'all days', selectedDays: WEEKDAYS, expectedPattern: [true, true, true, true, true, true, true] },
    { desc: 'invalid strings filtered', selectedDays: ['mandag', 'invalid', 'onsdag', '', 'fredag', 'notaday'], expectedPattern: [true, false, true, false, true, false, false] }
]

const testConfigurations = [
    {
        name: 'boolean (backward compatibility)',
        options: undefined,
        selectedValue: true,
        unselectedValue: false,
        validInputs: [
            { desc: 'mixed values', input: [true, false, true, false, true, false, true] },
            { desc: 'all false', input: false },
            { desc: 'all true', input: true }
        ],
        hasRequiredSchema: true,
        requiredMessage: 'Man skal lave mad mindst en dag om ugen'
    },
    {
        name: 'DinnerMode preferences',
        options: {
            valueSchema: z.nativeEnum(DinnerMode),
            defaultValue: DinnerMode.NONE
        },
        selectedValue: DinnerMode.DINEIN,
        unselectedValue: DinnerMode.NONE,
        validInputs: [
            { desc: 'mixed modes', input: [DinnerMode.DINEIN, DinnerMode.TAKEAWAY, DinnerMode.NONE, DinnerMode.DINEIN, DinnerMode.NONE, DinnerMode.TAKEAWAY, DinnerMode.NONE] },
            { desc: 'all NONE', input: DinnerMode.NONE },
            { desc: 'all DINEIN', input: DinnerMode.DINEIN }
        ],
        hasRequiredSchema: false
    }
]

testConfigurations.forEach(({ name, options, selectedValue, unselectedValue, validInputs, hasRequiredSchema, requiredMessage }) => {
    describe(`useWeekDayMapValidation - ${name}`, () => {
        const composable = useWeekDayMapValidation(options)
        const { WeekDayMapSchema, WeekDayMapSchemaRequired, WeekDayMapSchemaOptional, serializeWeekDayMap, deserializeWeekDayMap, createWeekDayMapFromSelection, createDefaultWeekdayMap } = composable

        describe('WeekDayMapSchema', () => {
            validInputs.forEach(({ desc, input }) => {
                it(`should validate map with ${desc}`, () => {
                    const validMap = createDefaultWeekdayMap(input)
                    const result = WeekDayMapSchema.safeParse(validMap)
                    expect(result.success).toBe(true)
                })
            })
        })

        if (hasRequiredSchema && WeekDayMapSchemaRequired) {
            describe('WeekDayMapSchemaRequired', () => {
                it('should accept map with at least one selected value', () => {
                    const validMap = createDefaultWeekdayMap([selectedValue, unselectedValue, unselectedValue, unselectedValue, unselectedValue, unselectedValue, unselectedValue])
                    const result = WeekDayMapSchemaRequired.safeParse(validMap)
                    expect(result.success).toBe(true)
                })

                it('should reject map with all unselected values', () => {
                    const allUnselected = createDefaultWeekdayMap(unselectedValue)
                    const result = WeekDayMapSchemaRequired.safeParse(allUnselected)
                    expect(result.success).toBe(false)
                    if (!result.success && requiredMessage) {
                        expect(result.error.errors[0]?.message).toBe(requiredMessage)
                    }
                })
            })
        }

        if (WeekDayMapSchemaOptional) {
            describe('WeekDayMapSchemaOptional', () => {
                const optionalTestCases = [
                    { desc: 'all unselected', input: unselectedValue },
                    { desc: 'some selected', input: [selectedValue, selectedValue, unselectedValue, unselectedValue, unselectedValue, unselectedValue, unselectedValue] }
                ]

                optionalTestCases.forEach(({ desc, input }) => {
                    it(`should accept map with ${desc}`, () => {
                        const map = createDefaultWeekdayMap(input)
                        const result = WeekDayMapSchemaOptional.safeParse(map)
                        expect(result.success).toBe(true)
                    })
                })
            })
        }

        describe('createWeekDayMapFromSelection', () => {
            selectionTestCases.forEach(({ desc, selectedDays, expectedPattern }) => {
                it(`should create map from ${desc}`, () => {
                    const map = createWeekDayMapFromSelection(selectedDays, selectedValue, unselectedValue)
                    const expected = expectedPattern.map(isSelected => isSelected ? selectedValue : unselectedValue)
                    expected.forEach((value, index) => {
                        expect(map[WEEKDAYS[index]]).toBe(value)
                    })
                })
            })
        })

        describe('serialization', () => {
            validInputs.forEach(({ desc, input }) => {
                it(`should roundtrip ${desc}`, () => {
                    const original = createDefaultWeekdayMap(input)
                    const serialized = serializeWeekDayMap(original)
                    expect(typeof serialized).toBe('string')
                    const deserialized = deserializeWeekDayMap(serialized)
                    expect(deserialized).toEqual(original)
                })
            })

            it('should roundtrip through serialization and validation', () => {
                const selectedDays = [WEEKDAYS[1], WEEKDAYS[3], WEEKDAYS[5]]
                const original = createWeekDayMapFromSelection(selectedDays, selectedValue, unselectedValue)
                const serialized = serializeWeekDayMap(original)
                expect(typeof serialized).toBe('string')
                const deserialized = deserializeWeekDayMap(serialized)
                const validationResult = WeekDayMapSchema.safeParse(deserialized)
                expect(validationResult.success).toBe(true)
                if (validationResult.success) {
                    expect(validationResult.data).toEqual(original)
                }
            })

            if (name === 'boolean (backward compatibility)') {
                it('should deserialize "[]" (empty array string) to null', () => {
                    const deserialized = deserializeWeekDayMap("[]")
                    expect(deserialized).toBeNull()
                })
            }
        })
    })
})

describe('maskWeekDayMap', () => {
    const {maskWeekDayMap} = useWeekDayMapValidation({
        valueSchema: z.nativeEnum(DinnerMode),
        defaultValue: DinnerMode.DINEIN
    })

    const createMask = (pattern: boolean[]) =>
        WEEKDAYS.reduce((acc, day, i) => ({...acc, [day]: pattern[i]}), {} as Record<string, boolean>)

    const createPrefs = (values: DinnerMode[]) =>
        WEEKDAYS.reduce((acc, day, i) => ({...acc, [day]: values[i]}), {} as Record<string, DinnerMode>)

    it('should create defaults when source is null', () => {
        const mask = createMask([true, false, true, false, true, false, false]) // Mon, Wed, Fri
        const result = maskWeekDayMap(null, mask, DinnerMode.DINEIN, DinnerMode.NONE)

        WEEKDAYS.forEach(day => {
            const expected = mask[day] ? DinnerMode.DINEIN : DinnerMode.NONE
            expect(result[day], `${day}`).toBe(expected)
        })
    })

    it('should preserve masked values and clip unmasked to maskedValue', () => {
        const mask = createMask([true, false, true, false, true, false, false])
        const source = createPrefs([
            DinnerMode.TAKEAWAY,   // Mon - masked, preserve
            DinnerMode.DINEIN,     // Tue - unmasked, clip
            DinnerMode.DINEINLATE, // Wed - masked, preserve
            DinnerMode.TAKEAWAY,   // Thu - unmasked, clip
            DinnerMode.NONE,       // Fri - masked, preserve
            DinnerMode.DINEIN,     // Sat - unmasked, clip
            DinnerMode.DINEINLATE  // Sun - unmasked, clip
        ])

        const result = maskWeekDayMap(source, mask, DinnerMode.DINEIN, DinnerMode.NONE)

        const expected = [
            DinnerMode.TAKEAWAY,   // Preserved
            DinnerMode.NONE,       // Clipped
            DinnerMode.DINEINLATE, // Preserved
            DinnerMode.NONE,       // Clipped
            DinnerMode.NONE,       // Preserved (was NONE)
            DinnerMode.NONE,       // Clipped
            DinnerMode.NONE        // Clipped
        ]

        WEEKDAYS.forEach((day, i) => {
            expect(result[day], `${day}`).toBe(expected[i])
        })
    })
})