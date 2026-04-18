import {z} from 'zod'
import {useQueryParam} from '~/composables/useQueryParam'
import {startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachWeekOfInterval, addDays} from 'date-fns'
import type {DateRange} from '~/types/dateTypes'
import {getPeriodBoundary} from '~/utils/date'

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
  const {getNextDinnerDate} = useSeason()

  return useQueryParam<Date>('date', {
    serialize: formatDate,
    deserialize: (s) => {
      const parsed = parseDate(s)
      return parsed && !isNaN(parsed.getTime()) ? parsed : null
    },
    validate: (date) => options.dinnerDates().some(d => d.toDateString() === date.toDateString()),
    defaultValue: () => {
      const nextDinner = getNextDinnerDate(options.dinnerDates())
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
 * Navigation algorithm (single path for day/week/month):
 *   1. Compute a period boundary from (selectedDate, view, direction) via `getPeriodBoundary`.
 *   2. Feed that boundary into `useSeason().getAdjacentDinner` as a "reference time".
 *   3. getAdjacentDinner returns the next/previous dinner on the appropriate side of the
 *      boundary, or `null` when there is none (→ arrow hidden, navigation no-ops).
 *
 * Season clamping is NOT needed: dinners outside the active season are not in `dinnerDates`,
 * so adjacency naturally stops at season edges.
 *
 * @example
 * ```ts
 * const { hasPrev, hasNext, navigate, dateRange } = useBookingView({
 *   selectedDate,
 *   setDate,
 *   view,
 *   setView,
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
    /** Dinner event dates - used for adjacency lookup. Absent or empty ⇒ no navigation. */
    dinnerDates?: () => Date[]
}) => {
    const view = options.view ?? computed(() => 'day' as BookingView)
    const {selectedDate, setDate} = options
    const {getAdjacentDinner} = useSeason()

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
     * Single adjacency lookup used by hasPrev/hasNext and navigate.
     * Returns the Date of the adjacent dinner (or null when none).
     */
    const findAdjacent = (direction: 1 | -1): Date | null => {
        const dinnerDates = options.dinnerDates?.() ?? []
        if (dinnerDates.length === 0) return null
        const boundary = getPeriodBoundary(selectedDate.value, view.value, direction)
        const events = dinnerDates.map(d => ({date: d}))
        return getAdjacentDinner(events, boundary, direction)
    }

    const hasPrev = computed(() => findAdjacent(-1) !== null)
    const hasNext = computed(() => findAdjacent(1) !== null)

    /**
     * Navigate to the adjacent dinner in the given direction.
     * No-op when there is no adjacent dinner (e.g. first/last event of season).
     */
    const navigate = async (direction: 1 | -1): Promise<void> => {
        const target = findAdjacent(direction)
        if (target) await setDate(target)
    }

    return {
        view,
        selectedDate,
        dateRange,
        weeks,
        hasPrev,
        hasNext,
        navigate
    }
}
