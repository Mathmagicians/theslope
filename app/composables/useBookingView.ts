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
 * useDinnerDateParam - Reusable date query param for dinner navigation
 *
 * Validates that selected date is a dinner date, defaults to next upcoming dinner.
 * Used by dinner page, chef page, household bookings.
 */
export const useDinnerDateParam = (options: {
  dinnerDates: () => Date[]
  syncWhen: () => boolean
}) => {
  const {getNextDinnerDate, getDefaultDinnerStartTime} = useSeason()
  const dinnerStartTime = getDefaultDinnerStartTime()

  return useQueryParam<Date>('date', {
    serialize: formatDate,
    deserialize: (s) => {
      const parsed = parseDate(s)
      return parsed && !isNaN(parsed.getTime()) ? parsed : null
    },
    validate: (date) => options.dinnerDates().some(d => d.toDateString() === date.toDateString()),
    defaultValue: () => {
      const nextDinner = getNextDinnerDate(options.dinnerDates(), dinnerStartTime)
      return nextDinner?.start ?? options.dinnerDates()[0] ?? new Date()
    },
    syncWhen: options.syncWhen
  })
}

/**
 * useBookingView - Navigation and date range logic for booking calendars
 *
 * Curried composable: caller provides date/view state (from useQueryParam),
 * this composable provides navigation logic (hasPrev, hasNext, navigate, dateRange).
 *
 * @example
 * ```ts
 * // Page creates its own query params with custom validation
 * const {value: selectedDate, setValue: setDate} = useQueryParam<Date>('date', {
 *   validate: (d) => dinnerDates.value.some(...),
 *   defaultValue: getNextDinner
 * })
 *
 * // Pass to useBookingView for navigation
 * const { hasPrev, hasNext, navigate, dateRange } = useBookingView({
 *   selectedDate,
 *   setDate,
 *   dinnerDates: () => dinnerDates.value
 * })
 * ```
 */
export const useBookingView = (options: {
    /** Date ref from useQueryParam */
    selectedDate: ComputedRef<Date>
    /** Date setter from useQueryParam */
    setDate: (date: Date) => Promise<void>
    /** View ref from useQueryParam (optional - defaults to 'day') */
    view?: ComputedRef<BookingView>
    /** View setter from useQueryParam (optional) */
    setView?: (view: BookingView) => Promise<void>
    /** Season bounds for week/month navigation */
    seasonDates?: () => DateRange | null
    /** Dinner event dates - used for day view navigation to skip to next/prev cooking day */
    dinnerDates?: () => Date[]
}) => {
    // Default to 'day' view if not provided
    const view = options.view ?? computed(() => 'day' as BookingView)
    const selectedDate = options.selectedDate
    const setDate = options.setDate

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
     * Check if navigation is possible in a direction
     * Used by CalendarDateNav to show/hide arrows
     */
    const canNavigate = (direction: 1 | -1): boolean => {
        const date = selectedDate.value
        const bounds = options?.seasonDates?.()
        const dinnerDates = options?.dinnerDates?.() ?? []

        switch (view.value) {
            case 'day': {
                if (dinnerDates.length === 0) return false
                const currentIndex = dinnerDates.findIndex(d => isSameDay(d, date))
                if (direction === 1) {
                    return currentIndex >= 0
                        ? currentIndex < dinnerDates.length - 1
                        : dinnerDates.some(d => d > date)
                } else {
                    return currentIndex >= 0
                        ? currentIndex > 0
                        : dinnerDates.some(d => d < date)
                }
            }
            case 'week':
            case 'month': {
                if (!bounds) return true
                const newDate = view.value === 'week'
                    ? addDays(date, direction * 7)
                    : new Date(date.getFullYear(), date.getMonth() + direction, date.getDate())
                return direction === 1 ? newDate <= bounds.end : newDate >= bounds.start
            }
        }
    }

    const hasPrev = computed(() => canNavigate(-1))
    const hasNext = computed(() => canNavigate(1))

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
        // View state (passthrough for convenience)
        view,
        selectedDate,
        // Computed ranges
        dateRange,
        weeks,
        // Navigation
        hasPrev,
        hasNext,
        navigate
    }
}
