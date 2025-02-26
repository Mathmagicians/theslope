import {
    addDays, setISOWeek, startOfISOWeekYear, isSameDay, eachDayOfInterval, getISODay,
    isValid, parse, format, isWithinInterval, areIntervalsOverlapping
} from "date-fns"
import {da} from "date-fns/locale"
import type {DateRange, WeekDay, WeekDayMap} from "~/types/dateTypes"
import {WEEKDAYS} from "~/types/dateTypes"

export const DATE_SETTINGS =
    {
        DATE_MASK: 'dd/MM/yyyy',
        locale: da,
        USER_MASK: 'dd/mm/åååå',
        SEASON_NAME_MASK: 'MM/yy'
    }

// Takes a iso week number, and a year in which the week is in, and a weekday number (0-6),
// and returns the date of that weekday in that week in that year
export function calculateDayFromWeekNumber(weekday: number, weekNumber: number, year: number): Date {
    const firstDay = setISOWeek(startOfISOWeekYear(new Date(year, 0, 4)), weekNumber)
    return addDays(firstDay, weekday)
}

export function createDateRange(start:Date = new Date(), end:Date= new Date()): DateRange {
    return {
        start: start ,
        end: end
    }
}

export function copyPartialDateRange(range: Partial<DateRange>): Partial<DateRange> {
    return range.start && range.end ?   createDateRange( range.start, range.end) :
        {start: range.start ?? undefined, end: range.end ?? undefined}
}

export const formatDate = (date: Date | undefined, mask:string = DATE_SETTINGS.DATE_MASK) =>
    date !== undefined && isValid(date) ? format(date, mask, {locale: DATE_SETTINGS.locale}) : ''

export const parseDate = (dateStr: string) => {
    const parsedDate = parse(dateStr, DATE_SETTINGS.DATE_MASK, new Date())
    return parsedDate
}

export function formatDateRange(range: DateRange | undefined, mask:string = DATE_SETTINGS.DATE_MASK): string {
    return ! range  ? '?->?' : `${formatDate(range?.start, mask)} - ${formatDate(range?.end, mask)}`
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

    return eachDayOfInterval({start, end})
        .filter(date => selectedDayIndices.includes(getISODay(date)))
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

export function eachDayOfManyIntervals(intervals: Array<{ start: Date, end: Date }>): Date[] {
    return intervals.flatMap(range => eachDayOfInterval({start: range.start, end: range.end}))
}

export function excludeDatesFromInterval(
    intervalDates: Date[],
    excludeDates: Array<{ start: Date, end: Date }>
): Date[] {
    const allExcludedDates = excludeDates.flatMap(range =>
        eachDayOfInterval({start: range.start, end: range.end})
    )

    return intervalDates.filter(date =>
        !allExcludedDates.some(excludeDate => isSameDay(date, excludeDate))
    )
}

export function isDateRangeInside(base: DateRange, other: DateRange): boolean {
    return isWithinInterval(other.start, base) && isWithinInterval(other.end, base)
}

export function compareDateRanges(a: DateRange, b: DateRange): number {
    return a.start.getTime() - b.start.getTime()
}
export function areRangesOverlapping(ranges: DateRange[]): boolean {
    if(ranges.length < 2) return false
   return  ranges.sort(compareDateRanges)
       .reduce((acc, current, index, sorted) => {
            if(index === 0) return acc
           return acc || areIntervalsOverlapping(sorted[index-1], current)
       }, false)

}
