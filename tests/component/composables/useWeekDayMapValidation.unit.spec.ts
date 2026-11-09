import {describe, it, expect} from 'vitest'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import {WEEKDAYS} from '~/types/dateTypes'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useCoreValidation} from '~/composables/useCoreValidation'

const {DinnerModeSchema} = useBookingValidation()
const DinnerMode = DinnerModeSchema.enum

describe('useWeekDayMapValidation - boolean (backward compatibility)', () => {
    const composable = useWeekDayMapValidation()
    const { WeekDayMapSchema, WeekDayMapSchemaOptional, serializeWeekDayMap, deserializeWeekDayMap, createWeekDayMapFromSelection, createDefaultWeekdayMap } = composable

    describe('WeekDayMapSchemaOptional', () => {
        it('should accept map with all unselected', () => {
            const result = WeekDayMapSchemaOptional.safeParse(createDefaultWeekdayMap(false))
            expect(result.success).toBe(true)
        })
    })

    describe('createWeekDayMapFromSelection', () => {
        it('should create map from the valid days and filter invalid strings', () => {
            const map = createWeekDayMapFromSelection(['mandag', 'invalid', 'onsdag', '', 'fredag', 'notaday'], true, false)
            expect(WEEKDAYS.map(day => map[day])).toEqual([true, false, true, false, true, false, false])
        })
    })

    describe('serialization', () => {
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
        valueSchema: DinnerModeSchema,
        defaultValue: DinnerMode.NONE
    })
    const { WeekDayMapSchema, serializeWeekDayMap, deserializeWeekDayMap, createWeekDayMapFromSelection } = composable

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

    // The schema of the preference write's body
    const {WeekDayMapSchemaOptional: PreferencesSchema, createDefaultWeekdayMap: createPreferences} = useCoreValidation()

    it.each([
        {
            getData: () => ({...createPreferences(DinnerMode.DINEIN), [WEEKDAYS[0]]: 'INVALID_MODE'}),
            description: 'invalid DinnerMode value'
        },
        {
            getData: () => {
                const {[WEEKDAYS[2]]: _wednesday, [WEEKDAYS[3]]: _thursday, ...map} = createPreferences(DinnerMode.DINEIN)
                return map
            },
            description: 'incomplete WeekDayMap (missing days)'
        }
    ])('should reject dinnerPreferences with $description', ({getData}) => {
        expect(PreferencesSchema.safeParse(getData()).success).toBe(false)
    })
})

describe('maskWeekDayMap', () => {
    const {maskWeekDayMap, createDefaultWeekdayMap: createPrefs} = useWeekDayMapValidation({
        valueSchema: DinnerModeSchema,
        defaultValue: DinnerMode.DINEIN
    })
    const {createDefaultWeekdayMap: createMask} = useWeekDayMapValidation()

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
