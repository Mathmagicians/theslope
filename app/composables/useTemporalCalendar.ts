/**
 * useTemporalCalendar - Shared temporal calendar logic
 *
 * Provides:
 * - Temporal splitting (next/future/past events)
 * - Event list creation helpers, and a day's temporal category read back from those lists
 * - The dinner start hour the countdown counts to
 * - The dinner on a calendar day, and whether it is cancelled
 *
 * Used by:
 * - DinnerCalendarDisplay (household booking view)
 * - ChefCalendarDisplay (chef cooking schedule)
 */
import {toValue, type MaybeRefOrGetter} from 'vue'
import type {DateValue} from '@internationalized/date'
import type {DinnerEventDisplay} from '~/composables/useBookingValidation'
import type {DayEventList} from '~/composables/useCalendarEvents'
import {isDinnerCancelled} from '~/composables/useBooking'

const TEMPORAL_LIST_ID = {
  [TEMPORAL_CATEGORY.next]: 'next-dinner',
  [TEMPORAL_CATEGORY.future]: 'future-dinners',
  [TEMPORAL_CATEGORY.past]: 'past-dinners'
} as const satisfies Record<TemporalCategory, string>

// The order a day's category resolves in, when the next dinner's day is also in another list
const TEMPORAL_PRECEDENCE: TemporalCategory[] = [TEMPORAL_CATEGORY.next, TEMPORAL_CATEGORY.future, TEMPORAL_CATEGORY.past]

const dayTypeOf = (eventLists: DayEventList[]): TemporalCategory | null =>
  TEMPORAL_PRECEDENCE.find(category => eventLists.some(list => list.listId === TEMPORAL_LIST_ID[category])) ?? null

const getDinnerForDay = <T extends { date: Date }>(dinnerEvents: T[], day: DateValue): T | undefined =>
  getDinnerOnDate(dinnerEvents)(toDate(day))

const isCancelledDay = (dinnerEvents: DinnerEventDisplay[], day: DateValue): boolean => {
  const dinner = getDinnerForDay(dinnerEvents, day)
  return dinner !== undefined && isDinnerCancelled(dinner)
}

export const useTemporalCalendar = () => {
  const {
    getDefaultDinnerStartTime,
    splitDinnerEvents
  } = useSeason()
  const {createEventList} = useCalendarEvents()

  /**
   * Split events into temporal categories (past/next/future)
   * Uses splitDinnerEvents which computes nextDinnerDateRange internally (DRY)
   * Returns dates (not events) for calendar badge display - extracts .date from events
   *
   * @param events - MaybeRefOrGetter of events array. Pass a getter (() => props.dinnerEvents)
   *                 to maintain reactivity when props change.
   */
  const useTemporalSplit = <T extends { date: Date }>(events: MaybeRefOrGetter<T[]>) => {
    const dinnerStartHour = getDefaultDinnerStartTime()
    const now = useClock()

    const splitResult = computed(() => splitDinnerEvents<T>(toValue(events), now.value))

    const nextDinner = computed(() => splitResult.value.nextDinner)
    // Extract dates from events for calendar badge display
    const pastDinnerDates = computed(() => splitResult.value.pastDinners.map(e => e.date))
    const futureDinnerDates = computed(() => splitResult.value.futureDinners.map(e => e.date))
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
    nextDinner: DinnerEventDisplay | null
  ) => [
    createEventList(pastDates, TEMPORAL_LIST_ID.past),
    createEventList(futureDates, TEMPORAL_LIST_ID.future),
    createEventList(nextDinner ? [nextDinner.date] : [], TEMPORAL_LIST_ID.next)
  ]

  return {
    useTemporalSplit,
    createTemporalEventLists,
    dayTypeOf,
    getDinnerForDay,
    isCancelledDay
  }
}
