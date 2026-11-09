import {describe, it, expect} from 'vitest'
import {changedWeekdays, createDefaultWeekdayMap, weekDayMapOf, WEEKDAYS, type WeekDay, type WeekDayMap} from '~/types/dateTypes'
import {useBookingValidation, type DinnerMode} from '~/composables/useBookingValidation'

describe('dateTypes - WeekDayMap factory functions', () => {
    describe('weekDayMapOf', () => {
        it('GIVEN a value of each weekday WHEN building the map THEN it holds every weekday with its own value, in the order of WEEKDAYS', () => {
            expect(Object.entries(weekDayMapOf(day => `${day}:${WEEKDAYS.indexOf(day)}`))).toEqual(WEEKDAYS.map((day, index) => [day, `${day}:${index}`]))
        })
    })

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

    // A preference save scopes its run to the weekdays its draft changes for any of the inhabitants it applies to
    describe('changedWeekdays', () => {
        const Mode = useBookingValidation().DinnerModeSchema.enum
        const dineIn: WeekDayMap<DinnerMode> = weekDayMapOf(() => Mode.DINEIN)

        it.each<{change: string, stored: (WeekDayMap<DinnerMode> | null)[], draft: WeekDayMap<DinnerMode>, expected: WeekDay[]}>([
            {change: 'Monday to Ingen', stored: [dineIn], draft: {...dineIn, mandag: Mode.NONE}, expected: ['mandag']},
            {change: 'Wednesday to takeaway and Friday to Ingen', stored: [dineIn], draft: {...dineIn, onsdag: Mode.TAKEAWAY, fredag: Mode.NONE}, expected: ['onsdag', 'fredag']},
            {change: 'nothing', stored: [dineIn], draft: {...dineIn}, expected: []},
            {change: 'every weekday over no stored map', stored: [null], draft: dineIn, expected: [...WEEKDAYS]},
            {change: 'Monday for one inhabitant and Friday for the other', stored: [{...dineIn, mandag: Mode.NONE}, {...dineIn, fredag: Mode.TAKEAWAY}], draft: dineIn, expected: ['mandag', 'fredag']}
        ])('GIVEN a draft changing $change WHEN compared with the stored maps THEN it names the weekdays that differ in any', ({stored, draft, expected}) => {
            expect(changedWeekdays(stored, draft)).toEqual(expected)
        })
    })
})
