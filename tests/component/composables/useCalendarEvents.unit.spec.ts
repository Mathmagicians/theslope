import {describe, it, expect} from 'vitest'
import {useCalendarEvents, RENDER_STYLE, type CalendarEventList, type RenderStyle} from '~/composables/useCalendarEvents'
import {CalendarDate} from '@internationalized/date'

// Test factories
const createTestDate = (day: number, month = 0, year = 2025) => new Date(year, month, day)

const createTestDates = (count: number, startDay = 1): Date[] =>
    Array.from({length: count}, (_, i) => createTestDate(startDay + i))

const createTestDateValue = ({ day, month = 1, year = 2025 }: { day: number, month?: number, year?: number }): CalendarDate =>
  new CalendarDate(year, month, day)

// Helper assertions
const expectEventListStructure = (
    result: CalendarEventList,
    expected: { listId: string, renderStyle: RenderStyle, eventCount: number }
) => {
    expect(result.listId).toBe(expected.listId)
    expect(result.renderStyle).toBe(expected.renderStyle)
    expect(result.events).toHaveLength(expected.eventCount)
}

describe('useCalendarEvents', () => {
    describe('createEventList', () => {
        it('creates an event list from the dates, with no colour and no band unless given', () => {
            const {createEventList} = useCalendarEvents()
            const dates = createTestDates(3)

            const result = createEventList(dates, 'test-list', RENDER_STYLE.ring)

            expectEventListStructure(result, {listId: 'test-list', renderStyle: RENDER_STYLE.ring, eventCount: 3})
            expect(result.color).toBeUndefined()
            expect(result.band).toBeUndefined()
            dates.forEach((date, i) => {
                expect(result.events[i]!.date).toEqual(date)
            })
        })

        it('includes optional label in all events', () => {
            const {createEventList} = useCalendarEvents()
            const dates = createTestDates(2)

            const result = createEventList(dates, 'team-1', RENDER_STYLE.badge, {label: 'Hold 1'})

            result.events.forEach(event => {
                expect(event.label).toBe('Hold 1')
            })
        })

        it.each([
            {option: 'color', options: {color: 'mocha'}, read: (list: CalendarEventList) => list.color, expected: 'mocha'},
            {option: 'band', options: {band: 2}, read: (list: CalendarEventList) => list.band, expected: 2},
            {option: 'metadata', options: {metadata: {teamId: 42}}, read: (list: CalendarEventList) => list.events[0]!.metadata, expected: {teamId: 42}}
        ])('includes optional $option', ({options, read, expected}) => {
            const {createEventList} = useCalendarEvents()

            const result = createEventList([createTestDate(15)], 'test-list', RENDER_STYLE.badge, options)

            expect(read(result)).toEqual(expected)
        })
    })

    describe('createEventMap', () => {
        it('merges multiple event lists with different listIds', () => {
            const {createEventList, createEventMap} = useCalendarEvents()

            const list1 = createEventList([createTestDate(15)], 'holidays', RENDER_STYLE.background)
            const list2 = createEventList([createTestDate(20)], 'team-1', RENDER_STYLE.badge)

            const result = createEventMap([list1, list2])

            expect(result.size).toBe(2)
            expect(result.get('15/01/2025')![0]?.listId).toBe('holidays')
            expect(result.get('20/01/2025')![0]?.listId).toBe('team-1')
        })

        it('handles multiple events on same date from different lists', () => {
            const {createEventList, createEventMap} = useCalendarEvents()
            const date = createTestDate(15)

            const lists = [
                createEventList([date], 'holidays', RENDER_STYLE.background),
                createEventList([date], 'team-1', RENDER_STYLE.badge),
                createEventList([date], 'bookings', RENDER_STYLE.chip)
            ]

            const result = createEventMap(lists)

            expect(result.size).toBe(1)
            const events = result.get('15/01/2025')!
            expect(events).toHaveLength(3)
            expect(events.map(e => e.listId)).toEqual(['holidays', 'team-1', 'bookings'])
        })
    })

    describe('getEventsForDay', () => {
        it('returns empty array for day with no events', () => {
            const {createEventList, createEventMap, getEventsForDay} = useCalendarEvents()

            const eventList = createEventList([createTestDate(15)], 'test-list', RENDER_STYLE.badge)
            const eventMap = createEventMap([eventList])

            const result = getEventsForDay(createTestDateValue({ day: 20 }), eventMap)

            expect(result).toEqual([])
        })

        it('returns the events of every list on the calendar day', () => {
            const {createEventList, createEventMap, getEventsForDay} = useCalendarEvents()
            const date = createTestDate(15)

            const lists = Array.from({length: 3}, (_, i) =>
                createEventList([date], `list-${i}`, RENDER_STYLE.badge, {label: `Event ${i}`})
            )
            const eventMap = createEventMap(lists)

            const result = getEventsForDay(createTestDateValue({ day: 15 }), eventMap)

            expect(result).toHaveLength(3)
            result.forEach((event, i) => {
                expect(event.listId).toBe(`list-${i}`)
                expect(event.label).toBe(`Event ${i}`)
            })
        })
    })

    describe('getEventListsForDay', () => {
        it('returns empty array for day with no events', () => {
            const {createEventList, createEventMap, getEventListsForDay} = useCalendarEvents()
            const eventList = createEventList([createTestDate(15)], 'test-list', RENDER_STYLE.badge)
            const eventMap = createEventMap([eventList])

            const result = getEventListsForDay(createTestDateValue({ day: 20 }), [eventList], eventMap)

            expect(result).toEqual([])
        })

        it('returns one DayEventList per source list, with its style, band and labels', () => {
            const {createEventList, createEventMap, getEventListsForDay} = useCalendarEvents()
            const date = createTestDate(15)

            const lists = Array.from({length: 3}, (_, i) =>
                createEventList([date], `team-${i}`, RENDER_STYLE.badge, {label: `Team ${i}`, band: i})
            )
            const eventMap = createEventMap(lists)

            const result = getEventListsForDay(createTestDateValue({ day: 15 }), lists, eventMap)

            expect(result).toHaveLength(3)
            result.forEach((dayList, i) => {
                expect(dayList.listId).toBe(`team-${i}`)
                expect(dayList.renderStyle).toBe(RENDER_STYLE.badge)
                expect(dayList.band).toBe(i)
                expect(dayList.events[0]!.label).toBe(`Team ${i}`)
            })
        })
    })
})
