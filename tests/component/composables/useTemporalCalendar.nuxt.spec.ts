import {describe, it, expect} from 'vitest'
import {CalendarDate} from '@internationalized/date'
import {TEMPORAL_CATEGORY, type TemporalCategory} from '~/utils/season'
import type {CalendarEventList} from '~/composables/useCalendarEvents'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'

// January 2025: a past dinner on the 6th, the next on the 15th, a future one on the 20th, another list's day on the 22nd
const PAST = new Date(2025, 0, 6)
const NEXT = new Date(2025, 0, 15)
const FUTURE = new Date(2025, 0, 20)
const OTHER = new Date(2025, 0, 22)

const dayOf = (date: Date) => new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
const nextDinnerOn = (date: Date) => ({...DinnerEventFactory.defaultDinnerEventDisplay(), date})

// The lists the calendar hands its day slot for one day
const dayListsOf = (date: Date, lists: CalendarEventList[]) => {
    const {createEventMap, getEventListsForDay} = useCalendarEvents()
    return getEventListsForDay(dayOf(date), lists, createEventMap(lists))
}

describe('useTemporalCalendar', () => {
    describe('dayTypeOf', () => {
        it.each<{date: Date, category: TemporalCategory}>([
            {date: PAST, category: TEMPORAL_CATEGORY.past},
            {date: NEXT, category: TEMPORAL_CATEGORY.next},
            {date: FUTURE, category: TEMPORAL_CATEGORY.future}
        ])('reads a $category dinner day back from the temporal event lists', ({date, category}) => {
            const {createTemporalEventLists, dayTypeOf} = useTemporalCalendar()
            const lists = createTemporalEventLists([PAST], [FUTURE], nextDinnerOn(NEXT))

            expect(dayTypeOf(dayListsOf(date, lists))).toBe(category)
        })

        it('reads no category on a day that only another list holds', () => {
            const {createTemporalEventLists, dayTypeOf} = useTemporalCalendar()
            const {createEventList} = useCalendarEvents()
            const lists = [...createTemporalEventLists([PAST], [FUTURE], nextDinnerOn(NEXT)), createEventList([OTHER], 'other-list')]

            expect(dayTypeOf(dayListsOf(OTHER, lists))).toBeNull()
        })

        it('reads the next dinner over a future dinner on the same day', () => {
            const {createTemporalEventLists, dayTypeOf} = useTemporalCalendar()
            const lists = createTemporalEventLists([], [NEXT], nextDinnerOn(NEXT))

            expect(dayTypeOf(dayListsOf(NEXT, lists))).toBe(TEMPORAL_CATEGORY.next)
        })
    })
})
