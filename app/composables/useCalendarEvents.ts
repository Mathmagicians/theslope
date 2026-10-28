import type {DateValue} from "@internationalized/date"
import {
    formatCalendarDate,
    formatDate
} from "~/utils/date"

/** How a calendar paints the days of an event list */
export const RENDER_STYLE = {badge: 'badge', chip: 'chip', ring: 'ring', background: 'background'} as const
export type RenderStyle = typeof RENDER_STYLE[keyof typeof RENDER_STYLE]

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
    renderStyle: RenderStyle
    color?: string              // A named colour
    band?: number               // The rainbow band the list's days wear (a team's band index)
}

// Event list for a specific day (includes list metadata + events for that day)
export type DayEventList = {
    listId: string
    renderStyle: RenderStyle
    color?: string
    band?: number
    events: CalendarEvent[]
}

export const useCalendarEvents = () => {
    const createEventList = (
        dates: Date[],
        listId: string,
        renderStyle: RenderStyle,
        options?: {
            label?: string
            color?: string
            band?: number
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
            color: options?.color,
            band: options?.band
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
                    band: sourceList.band,
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
