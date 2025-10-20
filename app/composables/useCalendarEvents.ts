import type {DateValue} from "@internationalized/date"
import {
    formatCalendarDate,
    formatDate
} from "~/utils/date"

// display format for the calendar component
export type CalendarEvent = {
    listId: string
    date: Date
    label?: string
    metadata?: unknown
}

export type CalendarEventList = {
    listId: string              // 'team-1', 'holidays', 'anna-bookins'
    events: Array<{
        date: Date
        label?: string            // Display text (e.g., "Hold 1", "Anna")
        metadata?: unknown        // Domain-specific data
    }>
    renderStyle: 'badge' | 'chip' | 'ring' | 'background'
    color?: string | number     // Business knowledge (team colorIndex)
}

// Event list for a specific day (includes list metadata + events for that day)
export type DayEventList = {
    listId: string
    renderStyle: 'badge' | 'chip' | 'ring' | 'background'
    color?: string | number
    events: CalendarEvent[]
}

export const useCalendarEvents = () => {
    const createEventList = (
        dates: Date[],
        listId: string,
        renderStyle: 'badge' | 'chip' | 'ring' | 'background',
        options?: {
            label?: string
            color?: string | number
            metadata?: unknown
        }
    ): CalendarEventList => {
        return {
            listId,
            events: dates.map(date => ({
                date,
                label: options?.label,
                metadata: options?.metadata
            })),
            renderStyle,
            color: options?.color
        }
    }

    const createEventMap = (eventLists: CalendarEventList[]): Map<string, CalendarEvent[]> => {
        const map = new Map<string, CalendarEvent[]>()
        eventLists.forEach(eventList => {
            eventList.events.forEach(({date, label, metadata}) => {
                    const dateKey = formatDate(date)
                    const calendarEvent: CalendarEvent = {
                        listId: eventList.listId,
                        date,
                        label,
                        metadata
                    }
                    const exists = map.get(dateKey) || []
                    map.set(dateKey, [...exists, calendarEvent])
                }
            )
        })
        return map
    }

    // Helper to create a consistent key from DateValue for map lookups. Nuxtui calendar works with DateValue, we work with Dates...
    const lookupKeyFromDateValue = (dateValue: DateValue): string => {
        return formatCalendarDate(dateValue)
    }

    const getEventsForDay = (day: DateValue, eventMap: Map<string, CalendarEvent[]>): CalendarEvent[] => {
        const key = lookupKeyFromDateValue(day)
        return eventMap.get(key) || []
    }

    // Get all event lists with events for a specific day (includes list metadata)
    const getEventListsForDay = (
        day: DateValue,
        eventLists: CalendarEventList[],
        eventMap: Map<string, CalendarEvent[]>
    ): DayEventList[] => {
        const events = getEventsForDay(day, eventMap)

        // Group events by listId and include list metadata
        const listMap = new Map<string, DayEventList>()

        events.forEach(event => {
            const sourceList = eventLists.find(list => list.listId === event.listId)
            if (!sourceList) return

            if (!listMap.has(event.listId)) {
                listMap.set(event.listId, {
                    listId: sourceList.listId,
                    renderStyle: sourceList.renderStyle,
                    color: sourceList.color,
                    events: []
                })
            }

            listMap.get(event.listId)!.events.push(event)
        })

        return Array.from(listMap.values())
    }

    return {
        createEventList,
        createEventMap,
        getEventsForDay,
        getEventListsForDay
    }
}
