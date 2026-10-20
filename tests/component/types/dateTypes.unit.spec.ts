import {describe, it, expect} from 'vitest'
import {changedWeekdays, createDefaultWeekdayMap, WEEKDAYS, type WeekDay, type WeekDayMap} from '~/types/dateTypes'
import {useBookingValidation, type DinnerMode} from '~/composables/useBookingValidation'

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

    // A preference save scopes its run to the weekdays its draft changes
    describe('changedWeekdays', () => {
        const Mode = useBookingValidation().DinnerModeSchema.enum
        const dineIn = Object.fromEntries(WEEKDAYS.map(day => [day, Mode.DINEIN])) as WeekDayMap<DinnerMode>

        it.each<{change: string, stored: WeekDayMap<DinnerMode> | null, draft: WeekDayMap<DinnerMode>, expected: WeekDay[]}>([
            {change: 'Monday to Ingen', stored: dineIn, draft: {...dineIn, mandag: Mode.NONE}, expected: ['mandag']},
            {change: 'Wednesday to takeaway and Friday to Ingen', stored: dineIn, draft: {...dineIn, onsdag: Mode.TAKEAWAY, fredag: Mode.NONE}, expected: ['onsdag', 'fredag']},
            {change: 'nothing', stored: dineIn, draft: {...dineIn}, expected: []},
            {change: 'every weekday over no stored map', stored: null, draft: dineIn, expected: [...WEEKDAYS]}
        ])('GIVEN a draft changing $change WHEN compared with the stored map THEN it names the weekdays that differ', ({stored, draft, expected}) => {
            expect(changedWeekdays(stored, draft)).toEqual(expected)
        })
    })
})
