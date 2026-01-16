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
    splitDinnerEvents
  } = useSeason()
  const {createEventList} = useCalendarEvents()

  /**
   * Split events into temporal categories (past/next/future)
   * Uses splitDinnerEvents which computes nextDinnerDateRange internally (DRY)
   */
  const useTemporalSplit = <T extends { date: Date }>(events: T[]) => {
    const dinnerStartHour = getDefaultDinnerStartTime()

    const splitResult = computed(() => splitDinnerEvents<T>(events))

    const nextDinner = computed(() => splitResult.value.nextDinner)
    const pastDinnerDates = computed(() => splitResult.value.pastDinnerDates)
    const futureDinnerDates = computed(() => splitResult.value.futureDinnerDates)
    const nextDinnerDateRange = computed(() => splitResult.value.nextDinnerDateRange)

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
