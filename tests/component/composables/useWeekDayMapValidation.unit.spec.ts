import {describe, it, expect} from 'vitest'
import {z} from 'zod'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import {WEEKDAYS, type WeekDayMap} from '~/types/dateTypes'
import {DinnerModeSchema} from '~~/prisma/generated/zod'

const DinnerMode = DinnerModeSchema.enum
type DinnerModeType = z.infer<typeof DinnerModeSchema>

const selectionTestCases = [
    { desc: 'Mon, Wed, Fri', selectedDays: [WEEKDAYS[0], WEEKDAYS[2], WEEKDAYS[4]], expectedPattern: [true, false, true, false, true, false, false] },
    { desc: 'no days', selectedDays: [] as string[], expectedPattern: [false, false, false, false, false, false, false] },
    { desc: 'all days', selectedDays: [...WEEKDAYS], expectedPattern: [true, true, true, true, true, true, true] },
    { desc: 'invalid strings filtered', selectedDays: ['mandag', 'invalid', 'onsdag', '', 'fredag', 'notaday'], expectedPattern: [true, false, true, false, true, false, false] }
]

describe('useWeekDayMapValidation - boolean (backward compatibility)', () => {
    const composable = useWeekDayMapValidation()
    const { WeekDayMapSchema, WeekDayMapSchemaRequired, WeekDayMapSchemaOptional, serializeWeekDayMap, deserializeWeekDayMap, createWeekDayMapFromSelection, createDefaultWeekdayMap } = composable

    const validInputs = [
        { desc: 'mixed values', input: [true, false, true, false, true, false, true] as boolean[] },
        { desc: 'all false', input: false },
        { desc: 'all true', input: true }
    ]

    describe('WeekDayMapSchema', () => {
        validInputs.forEach(({ desc, input }) => {
            it(`should validate map with ${desc}`, () => {
                const validMap = createDefaultWeekdayMap(input)
                const result = WeekDayMapSchema.safeParse(validMap)
                expect(result.success).toBe(true)
            })
        })
    })

    describe('WeekDayMapSchemaRequired', () => {
        it('should accept map with at least one selected value', () => {
            const validMap = createDefaultWeekdayMap([true, false, false, false, false, false, false])
            const result = WeekDayMapSchemaRequired!.safeParse(validMap)
            expect(result.success).toBe(true)
        })

        it('should reject map with all unselected values', () => {
            const allUnselected = createDefaultWeekdayMap(false)
            const result = WeekDayMapSchemaRequired!.safeParse(allUnselected)
            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.error.errors[0]?.message).toBe('Man skal lave mad mindst en dag om ugen')
            }
        })
    })

    describe('WeekDayMapSchemaOptional', () => {
        it.each([
            { desc: 'all unselected', input: false as boolean | boolean[] },
            { desc: 'some selected', input: [true, true, false, false, false, false, false] as boolean[] }
        ])('should accept map with $desc', ({ input }) => {
            const map = createDefaultWeekdayMap(input)
            const result = WeekDayMapSchemaOptional.safeParse(map)
            expect(result.success).toBe(true)
        })
    })

    describe('createWeekDayMapFromSelection', () => {
        selectionTestCases.forEach(({ desc, selectedDays, expectedPattern }) => {
            it(`should create map from ${desc}`, () => {
                const map = createWeekDayMapFromSelection(selectedDays, true, false)
                expectedPattern.forEach((expected, index) => {
                    expect(map[WEEKDAYS[index]!]).toBe(expected)
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
            const original = createWeekDayMapFromSelection(selectedDays, true, false)
            const serialized = serializeWeekDayMap(original)
            expect(typeof serialized).toBe('string')
            const deserialized = deserializeWeekDayMap(serialized)
            const validationResult = WeekDayMapSchema.safeParse(deserialized)
            expect(validationResult.success).toBe(true)
            if (validationResult.success) {
                expect(validationResult.data).toEqual(original)
            }
        })

        it('should deserialize "[]" (empty array string) to null', () => {
            const deserialized = deserializeWeekDayMap("[]")
            expect(deserialized).toBeNull()
        })
    })
})

describe('useWeekDayMapValidation - DinnerMode preferences', () => {
    const composable = useWeekDayMapValidation({
        valueSchema: z.nativeEnum(DinnerMode),
        defaultValue: DinnerMode.NONE
    })
    const { WeekDayMapSchema, WeekDayMapSchemaOptional, serializeWeekDayMap, deserializeWeekDayMap, createWeekDayMapFromSelection, createDefaultWeekdayMap } = composable

    const validInputs = [
        { desc: 'mixed modes', input: [DinnerMode.DINEIN, DinnerMode.TAKEAWAY, DinnerMode.NONE, DinnerMode.DINEIN, DinnerMode.NONE, DinnerMode.TAKEAWAY, DinnerMode.NONE] as DinnerModeType[] },
        { desc: 'all NONE', input: DinnerMode.NONE as DinnerModeType },
        { desc: 'all DINEIN', input: DinnerMode.DINEIN as DinnerModeType }
    ]

    describe('WeekDayMapSchema', () => {
        validInputs.forEach(({ desc, input }) => {
            it(`should validate map with ${desc}`, () => {
                const validMap = createDefaultWeekdayMap(input)
                const result = WeekDayMapSchema.safeParse(validMap)
                expect(result.success).toBe(true)
            })
        })
    })

    describe('WeekDayMapSchemaOptional', () => {
        it.each([
            { desc: 'all unselected', input: DinnerMode.NONE as DinnerModeType | DinnerModeType[] },
            { desc: 'some selected', input: [DinnerMode.DINEIN, DinnerMode.DINEIN, DinnerMode.NONE, DinnerMode.NONE, DinnerMode.NONE, DinnerMode.NONE, DinnerMode.NONE] as DinnerModeType[] }
        ])('should accept map with $desc', ({ input }) => {
            const map = createDefaultWeekdayMap(input)
            const result = WeekDayMapSchemaOptional.safeParse(map)
            expect(result.success).toBe(true)
        })
    })

    describe('createWeekDayMapFromSelection', () => {
        selectionTestCases.forEach(({ desc, selectedDays, expectedPattern }) => {
            it(`should create map from ${desc}`, () => {
                const map = createWeekDayMapFromSelection(selectedDays, DinnerMode.DINEIN, DinnerMode.NONE)
                expectedPattern.forEach((isSelected, index) => {
                    const expected = isSelected ? DinnerMode.DINEIN : DinnerMode.NONE
                    expect(map[WEEKDAYS[index]!]).toBe(expected)
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
            const original = createWeekDayMapFromSelection(selectedDays, DinnerMode.DINEIN, DinnerMode.NONE)
            const serialized = serializeWeekDayMap(original)
            expect(typeof serialized).toBe('string')
            const deserialized = deserializeWeekDayMap(serialized)
            const validationResult = WeekDayMapSchema.safeParse(deserialized)
            expect(validationResult.success).toBe(true)
            if (validationResult.success) {
                expect(validationResult.data).toEqual(original)
            }
        })
    })
})

describe('maskWeekDayMap', () => {
    const {maskWeekDayMap} = useWeekDayMapValidation({
        valueSchema: z.nativeEnum(DinnerMode),
        defaultValue: DinnerMode.DINEIN
    })

    const createMask = (pattern: boolean[]): WeekDayMap<boolean> =>
        WEEKDAYS.reduce((acc, day, i) => ({...acc, [day]: pattern[i]!}), {} as WeekDayMap<boolean>)

    const createPrefs = (values: DinnerModeType[]): WeekDayMap<DinnerModeType> =>
        WEEKDAYS.reduce((acc, day, i) => ({...acc, [day]: values[i]!}), {} as WeekDayMap<DinnerModeType>)

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
