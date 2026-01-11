import {
    addDays, setISOWeek, startOfISOWeekYear, isSameDay, isSameWeek, eachDayOfInterval, getISODay,
    isValid, parse, format, isWithinInterval, areIntervalsOverlapping, eachWeekOfInterval, getISOWeek, parseISO,
    formatDistanceToNow, formatDistanceToNowStrict, differenceInHours, differenceInDays, intervalToDuration
} from "date-fns"
import {da} from "date-fns/locale"
import type {DateRange, WeekDay, WeekDayMap} from "~/types/dateTypes"
import {WEEKDAYS} from "~/types/dateTypes"
import {CalendarDate, type DateValue, toZoned, toCalendarDateTime, Time} from '@internationalized/date'

export const DATE_SETTINGS =
    {
        DATE_MASK: 'dd/MM/yyyy',
        locale: da,
        localeString: 'da-DK',
        USER_MASK: 'dd/mm/åååå',
        SEASON_NAME_MASK: 'MM/yy',
        timezone: 'Europe/Copenhagen',
        weekStartsOn: 1 as const // Monday (ISO week)
    }

/** Check if two dates are in the same week (Monday-based, ISO standard) */
export const areSameWeek = (a: Date, b: Date): boolean =>
    isSameWeek(a, b, {weekStartsOn: DATE_SETTINGS.weekStartsOn})

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

// Convert DateValue to JavaScript Date (DK/CPH timezone) CalendarDates are used by UCalendar components
export function toDate(dateValue: DateValue): Date {
    return dateValue.toDate('UTC')
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
    const jsDate = parseISO(date.toString())
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
 * Format Danish weekday to compact form
 * @param day - Full Danish weekday name (e.g., 'mandag')
 * @param ultraCompact - If true, return 1 letter (e.g., 'M'); if false, return 3 letters (e.g., 'Man')
 * @returns Capitalized weekday abbreviation
 */
export function formatWeekdayCompact(day: WeekDay, ultraCompact: boolean = false): string {
    const length = ultraCompact ? 1 : 3
    const abbreviated = day.substring(0, length)
    return abbreviated.charAt(0).toUpperCase() + abbreviated.slice(1)
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

/**
 * Format a date as relative time from now in Danish
 * @param dateString - ISO date string or Date object
 * @returns Relative time string (e.g., "for 2 timer siden", "i går")
 */
export function formatRelativeTime(dateString: string | Date): string {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString
    return formatDistanceToNow(date, { locale: DATE_SETTINGS.locale, addSuffix: true })
}

/**
 * Check if a date is considered "new" (within 7 days)
 * @param dateString - ISO date string or Date object
 * @returns True if the date is within 7 days from now
 */
export function isNew(dateString: string | Date): boolean {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString
    const days = differenceInDays(new Date(), date)
    return days <= 7
}

/**
 * Calculate current age from birth date
 * @param birthDate - Date of birth (Date, string, or null)
 * @returns Age in complete years, or null if birthDate is null/invalid
 */
export function calculateAge(birthDate: Date | string | null): number | null {
    if (!birthDate) return null
    const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate
    if (!isValid(birth)) return null
    return calculateAgeOnDate(birth, new Date())
}

/**
 * Format date with Danish 3-letter weekday abbreviation
 * @param date - Date to format
 * @returns Formatted string like "Man 15/11"
 */
export function formatDanishWeekdayDate(date: Date): string {
    return formatDate(date, 'EEE dd/MM')
}

/**
 * Format date with single-letter weekday and day number (compact for grids)
 * @param date - Date to format
 * @returns Formatted string like "M 15" (Monday 15th)
 */
export function formatCompactWeekdayDate(date: Date): string {
    return formatDate(date, 'EEEEE d')
}

/**
 * Calculate countdown from current time to target time
 * Shows days when >24h away, hours and minutes when <24h away
 * @param targetDate - Target date/time (e.g., dinner time)
 * @param currentDate - Current date/time (defaults to now)
 * @returns Countdown object with hours, minutes, and formatted Danish string
 */
export function calculateCountdown(
    targetDate: Date,
    currentDate: Date = new Date()
): { hours: number; minutes: number; formatted: string } {
    if (targetDate <= currentDate) {
        return { hours: 0, minutes: 0, formatted: 'Overskredet' }
    }

    const totalHours = differenceInHours(targetDate, currentDate)

    // More than 24 hours away - show days
    if (totalHours >= 24) {
        const daysText = formatDistanceToNowStrict(targetDate, {
            locale: DATE_SETTINGS.locale,
            unit: 'day'
        })
        const formatted = daysText.toUpperCase()
        return { hours: totalHours, minutes: 0, formatted }
    }

    // Less than 24 hours - show hours and minutes
    const duration = intervalToDuration({
        start: currentDate,
        end: targetDate
    })

    const hours = duration.hours ?? 0
    const minutes = duration.minutes ?? 0
    const formatted = hours > 0 ? `${hours}T ${minutes}M` : `${minutes}M`

    return { hours, minutes, formatted }
}

/**
 * Create a Date representing a specific local time in Copenhagen timezone.
 * Uses @internationalized/date for timezone-correct conversion.
 *
 * Essential for Cloudflare Workers (UTC runtime) where setHours() would set UTC hours.
 *
 * @param date - Date representing the day (only year/month/day used)
 * @param hour - Hour in 24h format (0-23) in Copenhagen local time
 * @param minute - Minute (0-59), defaults to 0
 * @returns Date where toISOString() gives correct UTC representation
 */
export function createDateInTimezone(
    date: Date,
    hour: number,
    minute: number = 0,
    timezone: string = DATE_SETTINGS.timezone
): Date {
    const calendarDate = toCalendarDate(date)!
    const calendarDateTime = toCalendarDateTime(calendarDate, new Time(hour, minute, 0, 0))
    return toZoned(calendarDateTime, timezone).toDate()
}
