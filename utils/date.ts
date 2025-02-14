import {addDays, setISOWeek, startOfISOWeekYear} from "date-fns";

export function calculateDayFromWeekNumber(weekday: number, weekNumber: number, year: number): Date {
    const firstDay =  setISOWeek(startOfISOWeekYear(new Date(year, 0, 4)), weekNumber)
    const nextDay = addDays(firstDay, weekday)
    return nextDay
}

// CLAUDE
// utils/date.ts
import {
    sub,
    format,
    isSameDay,
    eachDayOfInterval,
    getISODay,
    type Duration
} from 'date-fns'

export const WEEKDAYS = ['mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'loerdag', 'soendag'] as const
export type WeekDay = typeof WEEKDAYS[number]
export type WeekDayMap = Record<WeekDay, boolean>

export function isRangeSelected(start: Date, end: Date, duration: Duration): boolean {
    return isSameDay(start, sub(new Date(), duration)) &&
        isSameDay(end, new Date())
}

export function createDateRange(duration: Duration) {
    return {
        start: sub(new Date(), duration),
        end: new Date()
    }
}

export function getEachDayOfIntervalWithSelectedWeekdays(
    start: Date,
    end: Date,
    selectedDays: WeekDayMap
): Date[] {
    if (start > end) return []
    const selectedDayIndices = Object.entries(selectedDays)
        .flatMap(([day, isSelected]) =>
            isSelected ? WEEKDAYS.indexOf(day as WeekDay) + 1 : []
        )

    return eachDayOfInterval({ start, end })
        .filter(date => selectedDayIndices.includes(getISODay(date)))
}

export function formatDateRange(start: Date, end: Date): string {
    return `${format(start, 'd MMM, yyy')} - ${format(end, 'd MMM, yyy')}`
}

export function createDefaultWeekdayMap(value: boolean | boolean[] = false): WeekDayMap {
    if (Array.isArray(value)) {
        return WEEKDAYS.reduce((acc, day, index) => ({
            ...acc,
            [day]: value[index] ?? false
        }), {} as WeekDayMap)
    }

    return WEEKDAYS.reduce((acc, day) => ({
        ...acc,
        [day]: value
    }), {} as WeekDayMap)
}

export function eachDayOfManyIntervals(intervals: Array<{start: Date, end: Date}>): Date[] {
    return intervals.flatMap(range => eachDayOfInterval({start: range.start, end: range.end}))
}

export function excludeDatesFromInterval(
    intervalDates: Date[],
    excludeDates: Array<{start: Date, end: Date}>
): Date[] {
    const allExcludedDates = excludeDates.flatMap(range =>
        eachDayOfInterval({start: range.start, end: range.end})
    )

    return intervalDates.filter(date =>
        !allExcludedDates.some(excludeDate => isSameDay(date, excludeDate))
    )
}
