import {describe, it, expect} from 'vitest'
import {useCalendarEvents} from '~/composables/useCalendarEvents'
import type {CalendarEventList} from '~/composables/useCalendarEvents'
import {CalendarDate, type DateValue} from '@internationalized/date'
import {toCalendarDate, toDate, formatDate} from "~/utils/date"
import {isSameDay} from 'date-fns'

// Test factories
const createTestDate = (day: number, month = 0, year = 2025) => new Date(year, month, day)

const createTestDates = (count: number, startDay = 1): Date[] =>
    Array.from({length: count}, (_, i) => createTestDate(startDay + i))

const createTestDateValue = ({ day, month = 1, year = 2025 }: { day: number, month?: number, year?: number }): CalendarDate =>
  new CalendarDate(year, month, day)

// Helper assertions
const expectEventListStructure = (
    result: CalendarEventList,
    expected: { listId: string, renderStyle: string, eventCount: number }
) => {
    expect(result.listId).toBe(expected.listId)
    expect(result.renderStyle).toBe(expected.renderStyle)
    expect(result.events).toHaveLength(expected.eventCount)
}

describe('useCalendarEvents', () => {
    describe('createEventList', () => {
        it('creates event list from empty date array', () => {
            const {createEventList} = useCalendarEvents()

            const result = createEventList([], 'test-list', 'badge')

            expectEventListStructure(result, {listId: 'test-list', renderStyle: 'badge', eventCount: 0})
            expect(result.color).toBeUndefined()
        })

        it.each([
            {count: 1, renderStyle: 'chip' as const},
            {count: 3, renderStyle: 'ring' as const},
            {count: 5, renderStyle: 'badge' as const}
        ])('creates event list from $count date(s) with renderStyle $renderStyle', ({count, renderStyle}) => {
            const {createEventList} = useCalendarEvents()
            const dates = createTestDates(count)

            const result = createEventList(dates, 'test-list', renderStyle)

            expectEventListStructure(result, {listId: 'test-list', renderStyle, eventCount: count})
            dates.forEach((date, i) => {
                expect(result.events[i]!.date).toEqual(date)
            })
        })

        it.each([
            {listId: 'holidays', renderStyle: 'background' as const},
            {listId: 'team-1', renderStyle: 'badge' as const},
            {listId: 'bookings', renderStyle: 'chip' as const}
        ])('creates event list with listId=$listId and renderStyle=$renderStyle', ({listId, renderStyle}) => {
            const {createEventList} = useCalendarEvents()
            const date = createTestDate(15)

            const result = createEventList([date], listId, renderStyle)

            expect(result.listId).toBe(listId)
            expect(result.renderStyle).toBe(renderStyle)
        })

        it('includes optional label in all events', () => {
            const {createEventList} = useCalendarEvents()
            const dates = createTestDates(2)

            const result = createEventList(dates, 'team-1', 'badge', {label: 'Hold 1'})

            result.events.forEach(event => {
                expect(event.label).toBe('Hold 1')
            })
        })

        it.each([
            {optionKey: 'color', optionValue: 2},
            {optionKey: 'metadata', optionValue: {teamId: 42}}
        ])('includes optional $optionKey', ({optionKey, optionValue}) => {
            const {createEventList} = useCalendarEvents()
            const date = createTestDate(15)

            const result = createEventList([date], 'test-list', 'badge', {[optionKey]: optionValue})

            if (optionKey === 'color') {
                expect(result.color).toBe(optionValue)
            } else {
                expect(result.events[0]!.metadata).toEqual(optionValue)
            }
        })
    })

    describe('createEventMap', () => {
        it('creates empty map from empty event list array', () => {
            const {createEventMap} = useCalendarEvents()

            const result = createEventMap([])

            expect(result).toBeInstanceOf(Map)
            expect(result.size).toBe(0)
        })

        it.each([
            {eventCount: 1, expectedMapSize: 1},
            {eventCount: 3, expectedMapSize: 3}
        ])('creates map from single event list with $eventCount event(s)', ({eventCount, expectedMapSize}) => {
            const {createEventList, createEventMap} = useCalendarEvents()
            const dates = createTestDates(eventCount)

            const eventList = createEventList(dates, 'test-list', 'badge')
            const result = createEventMap([eventList])

            expect(result.size).toBe(expectedMapSize)
        })

        it('merges multiple event lists with different listIds', () => {
            const {createEventList, createEventMap} = useCalendarEvents()

            const list1 = createEventList([createTestDate(15)], 'holidays', 'background')
            const list2 = createEventList([createTestDate(20)], 'team-1', 'badge')

            const result = createEventMap([list1, list2])

            expect(result.size).toBe(2)
            expect(result.get('15/01/2025')![0]?.listId).toBe('holidays')
            expect(result.get('20/01/2025')![0]?.listId).toBe('team-1')
        })

        it('handles multiple events on same date from different lists', () => {
            const {createEventList, createEventMap} = useCalendarEvents()
            const date = createTestDate(15)

            const lists = [
                createEventList([date], 'holidays', 'background'),
                createEventList([date], 'team-1', 'badge'),
                createEventList([date], 'bookings', 'chip')
            ]

            const result = createEventMap(lists)

            expect(result.size).toBe(1)
            const events = result.get('15/01/2025')!
            expect(events).toHaveLength(3)
            expect(events.map(e => e.listId)).toEqual(['holidays', 'team-1', 'bookings'])
        })

        it.each([
            {day: 5, month: 0, expectedKey: '05/01/2025'},
            {day: 15, month: 0, expectedKey: '15/01/2025'},
            {day: 1, month: 11, expectedKey: '01/12/2025'}
        ])('uses formatDate consistently for day=$day month=$month', ({day, month, expectedKey}) => {
            const {createEventList, createEventMap} = useCalendarEvents()
            const date = createTestDate(day, month)

            const eventList = createEventList([date], 'test-list', 'badge')
            const result = createEventMap([eventList])

            expect(result.has(expectedKey)).toBe(true)
        })
    })

    describe('getEventsForDay', () => {
        it('returns empty array for day with no events', () => {
            const {createEventList, createEventMap, getEventsForDay} = useCalendarEvents()

            const eventList = createEventList([createTestDate(15)], 'test-list', 'badge')
            const eventMap = createEventMap([eventList])

            const result = getEventsForDay(createTestDateValue({ day: 20 }), eventMap)

            expect(result).toEqual([])
        })

        it.each([
            {listCount: 1, expectedEventCount: 1},
            {listCount: 3, expectedEventCount: 3}
        ])('returns $expectedEventCount event(s) from $listCount list(s)', ({listCount, expectedEventCount}) => {
            const {createEventList, createEventMap, getEventsForDay} = useCalendarEvents()
            const date = createTestDate(15)

            const lists = Array.from({length: listCount}, (_, i) =>
                createEventList([date], `list-${i}`, 'badge', {label: `Event ${i}`})
            )
            const eventMap = createEventMap(lists)

            const result = getEventsForDay(createTestDateValue({ day: 15 }), eventMap)

            expect(result).toHaveLength(expectedEventCount)
            result.forEach((event, i) => {
                expect(event.listId).toBe(`list-${i}`)
                expect(event.label).toBe(`Event ${i}`)
            })
        })

        it.each([
            {day: 5, month: 1, year: 2025},
            {day: 1, month: 6, year: 2024}
        ])('converts DateValue {day:$day, month:$month, year:$year} to correct map key', ({day, month, year}) => {
            const {createEventList, createEventMap, getEventsForDay} = useCalendarEvents()
            const jsDate = createTestDate(day, month, year)
            const calendarDate = toCalendarDate(jsDate)!

            // Debug: Understand the conversion behavior
            console.log(`\nTest case: day=${day}, month=${month}, year=${year}`)
            console.log('jsDate ISO:', jsDate.toISOString())
            console.log('jsDate local components:', {
                day: jsDate.getDate(),
                month: jsDate.getMonth() + 1,
                year: jsDate.getFullYear()
            })
            console.log('CalendarDate:', { year: calendarDate.year, month: calendarDate.month, day: calendarDate.day })

            const roundTripDate = toDate(calendarDate)
            console.log('roundTripDate ISO:', roundTripDate.toISOString())
            console.log('roundTripDate local components:', {
                day: roundTripDate.getDate(),
                month: roundTripDate.getMonth() + 1,
                year: roundTripDate.getFullYear()
            })

            // Verify round-trip preserves date (timezone-independent checks)
            expect(isSameDay(roundTripDate, jsDate)).toBe(true)
            expect(formatDate(roundTripDate)).toEqual(formatDate(jsDate))
            expect(roundTripDate.getDate()).toEqual(jsDate.getDate())
            expect(roundTripDate.getMonth()).toEqual(jsDate.getMonth())
            expect(roundTripDate.getFullYear()).toEqual(jsDate.getFullYear())

            const eventList = createEventList([jsDate], 'test-list', 'badge')
            const eventMap = createEventMap([eventList])

            const result = getEventsForDay(calendarDate, eventMap)

            expect(result).toHaveLength(1)
            expect(result[0]!.date).toEqual(toDate(calendarDate))
            expect(formatDate(result[0]!.date)).toEqual(formatDate(toDate(calendarDate)))
        })
    })

    describe('getEventListsForDay', () => {
        it.each([
            {
                description: 'empty array for day with no events',
                setupDay: 15,
                queryDay: 20,
                expectedListCount: 0
            },
            {
                description: 'single DayEventList with metadata for single event',
                setupDay: 15,
                queryDay: 15,
                listId: 'holidays',
                renderStyle: 'chip' as const,
                color: 'success',
                expectedListCount: 1
            },
            {
                description: 'DayEventList with team metadata and color',
                setupDay: 15,
                queryDay: 15,
                listId: 'team-1',
                renderStyle: 'badge' as const,
                color: 3,
                label: 'Hold 1',
                expectedListCount: 1
            }
        ])('returns $description', ({setupDay, queryDay, listId = 'test-list', renderStyle = 'badge', color, label, expectedListCount}) => {
            const {createEventList, createEventMap, getEventListsForDay} = useCalendarEvents()
            const date = createTestDate(setupDay)

            const eventList = createEventList([date], listId, renderStyle, {color, label})
            const eventMap = createEventMap([eventList])

            const result = getEventListsForDay(createTestDateValue({ day: queryDay }), [eventList], eventMap)

            expect(result).toHaveLength(expectedListCount)
            if (expectedListCount > 0) {
                expect(result[0]!.listId).toBe(listId)
                expect(result[0]!.renderStyle).toBe(renderStyle)
                expect(result[0]!.color).toBe(color)
                if (label) {
                    expect(result[0]!.events[0]!.label).toBe(label)
                }
            }
        })

        it.each([
            {listCount: 1, expectedListCount: 1},
            {listCount: 3, expectedListCount: 3}
        ])('returns $expectedListCount DayEventList(s) from $listCount source list(s)', ({listCount, expectedListCount}) => {
            const {createEventList, createEventMap, getEventListsForDay} = useCalendarEvents()
            const date = createTestDate(15)

            const lists = Array.from({length: listCount}, (_, i) =>
                createEventList([date], `team-${i}`, 'badge', {label: `Team ${i}`, color: i})
            )
            const eventMap = createEventMap(lists)

            const result = getEventListsForDay(createTestDateValue({ day: 15 }), lists, eventMap)

            expect(result).toHaveLength(expectedListCount)
            result.forEach((dayList, i) => {
                expect(dayList.listId).toBe(`team-${i}`)
                expect(dayList.renderStyle).toBe('badge')
                expect(dayList.color).toBe(i)
                expect(dayList.events[0]!.label).toBe(`Team ${i}`)
            })
        })
    })
})
