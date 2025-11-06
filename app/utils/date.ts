import {
    addDays, setISOWeek, startOfISOWeekYear, isSameDay, eachDayOfInterval, getISODay,
    isValid, parse, format, isWithinInterval, areIntervalsOverlapping, eachWeekOfInterval, getISOWeek
} from "date-fns"
import {da} from "date-fns/locale"
import type {DateRange, WeekDay, WeekDayMap} from "~/types/dateTypes"
import {WEEKDAYS} from "~/types/dateTypes"
import {CalendarDate, type DateValue} from '@internationalized/date'

export const DATE_SETTINGS =
    {
        DATE_MASK: 'dd/MM/yyyy',
        locale: da,
        USER_MASK: 'dd/mm/åååå',
        SEASON_NAME_MASK: 'MM/yy',
        timezone: 'Europe/Copenhagen'
    }

// Takes an iso week number, and a year in which the week is in, and a weekday number (0-6),
// and returns the date of that weekday in that week in that year
export function calculateDayFromWeekNumber(weekday: number, weekNumber: number, year: number): Date {
    const firstDay = setISOWeek(startOfISOWeekYear(new Date(year, 0, 4)), weekNumber)
    return addDays(firstDay, weekday)
}

export function createDateRange(start: Date = new Date(), end: Date = new Date()): DateRange {
    return {
        start: start,
        end: end
    }
}

export function copyPartialDateRange(range: Partial<DateRange>): Partial<DateRange> {
    return range.start && range.end ? createDateRange(range.start, range.end) :
        {start: range.start ?? undefined, end: range.end ?? undefined}
}

export const formatDate = (date: Date | undefined, mask: string = DATE_SETTINGS.DATE_MASK) =>
    date !== undefined && isValid(date) ? format(date, mask, {locale: DATE_SETTINGS.locale}) : ''

export const parseDate = (dateStr: string) => parse(dateStr, DATE_SETTINGS.DATE_MASK, new Date())

export function formatDateRange(range: DateRange | undefined, mask: string = DATE_SETTINGS.DATE_MASK): string {
    return !range ? '?->?' : `${formatDate(range?.start, mask)}-${formatDate(range?.end, mask)}`
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
    if (ranges.length < 2) return false
    return ranges.toSorted(compareDateRanges)
        .reduce((acc, current, index, sorted) => {
            if (index === 0) return acc
            const prev = sorted[index - 1]
            if (!prev) return acc
            return acc || (
                areIntervalsOverlapping(prev, current) ||
                (isSameDay(prev.start, current.start) && isSameDay(prev.end, current.end))
            )
        }, false)

}

export function toCalendarDate(date: Date | undefined): CalendarDate | undefined {
    if (!date || !isValid(date)) return undefined

    return new CalendarDate(
        date.getFullYear(),
        date.getMonth() + 1, // JavaScript months are 0-based, CalendarDate uses 1-based
        date.getDate()
    )
}

export function formatCalendarDate( date: DateValue ) : string {
    const jsDate = toDate(date)
    return formatDate(jsDate)
}

// Helper for ranges
export function toCalendarDateRange(range: DateRange | undefined): { start?: CalendarDate, end?: CalendarDate } {
    if (!range) return { start: undefined, end: undefined }

    return {
        start: toCalendarDate(range.start),
        end: toCalendarDate(range.end)
    }
}

// Check if a CalendarDate is in a list of Date objects
export function isCalendarDateInDateList(dateValue: DateValue, dateList: Date[]): boolean {
    const dateToCheck = dateValue.toDate(DATE_SETTINGS.timezone)
    return dateList.some(date => isSameDay(date, dateToCheck))
}

// Convert DateValue to JavaScript Date
export function toDate(dateValue: DateValue): Date {
    return dateValue.toDate(DATE_SETTINGS.timezone)
}

// Translate English weekday abbreviations to Danish
export function translateToDanish(day: string): string {
    const mapping: Record<string, string> = {
        'Mon': 'M',
        'Tue': 'T',
        'Wed': 'O',
        'Thu': 'T',
        'Fri': 'F',
        'Sat': 'L',
        'Sun': 'S'
    }
    return mapping[day] || day
}

/**
 * Format Danish weekday to compact 3-letter form
 * @param day - Full Danish weekday name (e.g., 'mandag')
 * @returns First 3 letters capitalized (e.g., 'Man')
 */
export function formatWeekdayCompact(day: WeekDay): string {
    return day.substring(0, 3)
}

/**
 * Calculate time periods based on week numbers within a date range.
 * Returns only time periods that fall within the date range.
 *
 * @param dates - The date range to search within
 * @param weekNumbers - ISO week numbers to select (e.g., [8, 42, 52])
 * @returns Array of date ranges (Monday-Sunday) within the period, that match week numbers from list
 */
export function selectWeekNumbersFromListThatFitInsideDateRange(
    dates: DateRange,
    weekNumbers: number[]
): DateRange[] {
    // Get all weeks within the date range as (week, year) tuples
    const weeksInRange = eachWeekOfInterval(
        { start: dates.start, end: dates.end },
        { weekStartsOn: 1 } // Monday (ISO week)
    ).map(weekStart => ({
        week: getISOWeek(weekStart),
        year: weekStart.getFullYear()
    }))

    // Filter to only weeks that match the week numbers from list
    const matchingWeeks = weeksInRange.filter(({ week }) =>
        weekNumbers.includes(week)
    )

    // Convert (week, year) tuples to DateRange (Monday-Sunday)
    const weekRanges = matchingWeeks.map(({ week, year }) => ({
        start: calculateDayFromWeekNumber(0, week, year), // Monday
        end: calculateDayFromWeekNumber(6, week, year)    // Sunday
    }))

    // Filter to only weeks fully within date range
    return weekRanges.filter(weekRange =>
        isDateRangeInside(dates, weekRange)
    )
}

/**
 * Calculate age in years on a specific date
 * @param birthDate - Date of birth
 * @param eventDate - Date to calculate age on
 * @returns Age in complete years
 */
export function calculateAgeOnDate(birthDate: Date, eventDate: Date): number {
    let age = eventDate.getFullYear() - birthDate.getFullYear()
    const monthDiff = eventDate.getMonth() - birthDate.getMonth()

    // If birthday hasn't occurred yet this year, subtract 1
    if (monthDiff < 0 || (monthDiff === 0 && eventDate.getDate() < birthDate.getDate())) {
        age--
    }

    return age
}
