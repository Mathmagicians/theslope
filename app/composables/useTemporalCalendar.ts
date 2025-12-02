/**
 * useTemporalCalendar - Shared temporal calendar logic
 *
 * Provides:
 * - Temporal splitting (next/future/past events)
 * - Event list creation helpers
 * - Countdown calculation utilities
 *
 * Used by:
 * - DinnerCalendarDisplay (household booking view)
 * - ChefCalendarDisplay (chef cooking schedule)
 *
 * Note: Components must handle their own countdown timers with lifecycle hooks.
 * This composable provides the calculation logic only.
 */
import type {DinnerEventDisplay} from '~/composables/useBookingValidation'

export const useTemporalCalendar = () => {
  const {
    getDefaultDinnerStartTime,
    getNextDinnerDate,
    splitDinnerEvents
  } = useSeason()
  const {createEventList} = useCalendarEvents()

  /**
   * Split events into temporal categories (past/next/future)
   */
  const useTemporalSplit = <T extends { date: Date | string }>(events: T[]) => {
    const dinnerStartHour = getDefaultDinnerStartTime()
    const dinnerDates = computed(() => events.map(e => new Date(e.date)))
    const nextDinnerDateRange = computed(() => getNextDinnerDate(dinnerDates.value, dinnerStartHour))

    const splitResult = computed(() =>
      splitDinnerEvents<T>(events, nextDinnerDateRange.value)
    )

    const nextDinner = computed(() => splitResult.value.nextDinner)
    const pastDinnerDates = computed(() => splitResult.value.pastDinnerDates)
    const futureDinnerDates = computed(() => splitResult.value.futureDinnerDates)

    return {
      nextDinner,
      pastDinnerDates,
      futureDinnerDates,
      nextDinnerDateRange,
      dinnerStartHour
    }
  }

  /**
   * Create standard event lists for temporal states
   */
  const createTemporalEventLists = (
    pastDates: Date[],
    futureDates: Date[],
    nextDinner: DinnerEventDisplay | null,
    color: string
  ) => {
    const pastEventList = createEventList(pastDates, 'past-dinners', 'badge', {
      color: 'mocha'
    })

    const futureEventList = createEventList(futureDates, 'future-dinners', 'badge', {
      color
    })

    const nextEventList = nextDinner
      ? createEventList([nextDinner.date], 'next-dinner', 'badge', { color })
      : createEventList([], 'next-dinner', 'badge')

    return [pastEventList, futureEventList, nextEventList]
  }

  return {
    useTemporalSplit,
    createTemporalEventLists
  }
}
