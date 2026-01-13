import {z} from 'zod'
import {useQueryParam} from '~/composables/useQueryParam'
import {startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachWeekOfInterval, addDays, isSameDay} from 'date-fns'
import type {DateRange} from '~/types/dateTypes'

/**
 * Booking view types for household booking page
 */
export const BookingViewSchema = z.enum(['day', 'week', 'month'])
export type BookingView = z.infer<typeof BookingViewSchema>

/**
 * useBookingView - URL-synced view type and date for booking calendar
 *
 * Reuses existing useQueryParam composable and date utilities (formatDate, parseDate).
 * URL format: ?view=week&date=15/01/2025
 *
 * @example
 * ```ts
 * const { view, selectedDate, dateRange, weeks, setView, setDate } = useBookingView({
 *   syncWhen: () => store.isReady
 * })
 *
 * // Month view with weeks
 * if (view.value === 'month') {
 *   weeks.value.forEach(week => ...)
 * }
 * ```
 */
export const useBookingView = (options?: {
    syncWhen?: () => boolean
    seasonDates?: () => DateRange | null
    /** Dinner event dates - used for day view navigation to skip to next/prev cooking day */
    dinnerDates?: () => Date[]
}) => {
    // View type param (day/week/month)
    const {value: view, setValue: setView} = useQueryParam<BookingView>('view', {
        serialize: (v) => v,
        deserialize: (s) => {
            const parsed = BookingViewSchema.safeParse(s)
            return parsed.success ? parsed.data : null
        },
        defaultValue: 'day',
        syncWhen: options?.syncWhen
    })

    // Date param - reuses existing formatDate/parseDate from utils
    const {value: selectedDate, setValue: setDate} = useQueryParam<Date>('date', {
        serialize: formatDate,
        deserialize: (s) => {
            const parsed = parseDate(s)
            return parsed && !isNaN(parsed.getTime()) ? parsed : null
        },
        defaultValue: () => new Date(),
        syncWhen: options?.syncWhen
    })

    /**
     * Date range for current view
     * - day: single day (start === end)
     * - week: Monday to Sunday
     * - month: first to last day of month
     */
    const dateRange = computed<DateRange>(() => {
        const date = selectedDate.value

        switch (view.value) {
            case 'day':
                return {start: date, end: date}
            case 'week':
                return {
                    start: startOfWeek(date, {weekStartsOn: 1}),
                    end: endOfWeek(date, {weekStartsOn: 1})
                }
            case 'month':
                return {
                    start: startOfMonth(date),
                    end: endOfMonth(date)
                }
        }
    })

    /**
     * Weeks in current month view (for month grid display)
     * Each week is Monday-Sunday
     */
    const weeks = computed<DateRange[]>(() => {
        if (view.value !== 'month') return []

        const monthStart = startOfMonth(selectedDate.value)
        const monthEnd = endOfMonth(selectedDate.value)

        // Get all week starts in the month
        const weekStarts = eachWeekOfInterval(
            {start: monthStart, end: monthEnd},
            {weekStartsOn: 1}
        )

        return weekStarts.map(weekStart => ({
            start: weekStart,
            end: addDays(weekStart, 6)
        }))
    })

    /**
     * Navigate to adjacent period based on view type
     * - Day view: navigates to next/previous cooking day (skips non-dinner days)
     * - Week/Month view: navigates by period
     * Clamps to season bounds if provided
     * @param direction - 1 for next, -1 for previous
     */
    const navigate = async (direction: 1 | -1) => {
        const date = selectedDate.value
        const bounds = options?.seasonDates?.()
        const dinnerDates = options?.dinnerDates?.() ?? []
        let newDate: Date | null = null

        switch (view.value) {
            case 'day':
                // Find next/previous dinner date
                if (dinnerDates.length > 0) {
                    const sortedDates = [...dinnerDates].sort((a, b) => a.getTime() - b.getTime())
                    const currentIndex = sortedDates.findIndex(d => isSameDay(d, date))

                    if (direction === 1) {
                        // Next: find first date after current
                        const nextDate = currentIndex >= 0
                            ? sortedDates[currentIndex + 1]
                            : sortedDates.find(d => d > date)
                        newDate = nextDate ?? null
                    } else {
                        // Previous: find last date before current
                        const prevDate = currentIndex >= 0
                            ? sortedDates[currentIndex - 1]
                            : sortedDates.filter(d => d < date).pop()
                        newDate = prevDate ?? null
                    }
                }
                // If no dinner dates or no adjacent found, don't navigate
                if (!newDate) return
                break
            case 'week':
                newDate = addDays(date, direction * 7)
                break
            case 'month':
                newDate = new Date(date)
                newDate.setMonth(newDate.getMonth() + direction)
                break
        }

        // Clamp to season bounds
        if (bounds && newDate) {
            if (newDate < bounds.start) newDate = bounds.start
            if (newDate > bounds.end) newDate = bounds.end
        }

        if (newDate) {
            await setDate(newDate)
        }
    }

    return {
        // View state
        view,
        selectedDate,
        dateRange,
        weeks,
        // Actions
        setView,
        setDate,
        navigate
    }
}
