<script setup lang="ts">
/**
 * CalendarDisplay - Shows potential cooking days and actual generated events
 *
 * Displays (design-system day circle: dayCircleClasses(variant)):
 * - Holidays (CALENDAR.holiday - green ring)
 * - Potential cooking days (PLANNING_CALENDAR.day.potential - pink outline) - days matching
 *   cookingDays pattern minus holidays
 * - Generated dinner events (PLANNING_CALENDAR.day.generated - pink filled)
 *
 * Uses BaseCalendar for consistent calendar structure and event management.
 * Domain-specific rendering via slots (rings for potential, filled for actual).
 */
import type {DateRange, WeekDayMap} from '~/types/dateTypes'
import type {DateValue} from "@internationalized/date"
import type {DinnerEventDisplay} from '~/composables/useBookingValidation'
import type {DayEventList} from '~/composables/useCalendarEvents'
import {isCalendarDateInDateList} from "~/utils/date"

interface Props {
  seasonDates: DateRange
  holidays: DateRange[]
  cookingDays: WeekDayMap
  dinnerEvents?: DinnerEventDisplay[]  // Optional: actual generated events
}

const props = defineProps<Props>()
const {createEventList} = useCalendarEvents()
const {getHolidayDatesFromDateRangeList, computeCookingDates} = useSeason()
const {PLANNING_CALENDAR, CALENDAR, dayCircleClasses} = useTheSlopeDesignSystem()

// Expand holiday ranges into individual dates
const holidayDates = computed(() => getHolidayDatesFromDateRangeList(props.holidays))

// Calculate potential cooking days using domain logic from utils/season
const potentialCookingDays = computed(() =>
  computeCookingDates(props.cookingDays, props.seasonDates, props.holidays)
)

// Extract dates from actual generated dinner events
const generatedEventDates = computed(() => {
  if (!props.dinnerEvents) return []
  return props.dinnerEvents.map(event => event.date)
})

// Transform into event lists for BaseCalendar
const potentialCookingEventList = computed(() =>
  createEventList(potentialCookingDays.value, 'potential-cooking', 'ring')
)

const generatedEventList = computed(() =>
  createEventList(generatedEventDates.value, 'generated-events', 'badge')
)

// Combine all event lists
const allEventLists = computed(() => [
  potentialCookingEventList.value,
  generatedEventList.value
])

// Check if a day is a holiday
const isHoliday = (day: DateValue): boolean => {
  return isCalendarDateInDateList(day, holidayDates.value)
}

// Helper to check if has potential cooking event
const hasPotentialCooking = (eventLists: DayEventList[]) => {
  return eventLists.some(list => list.listId === 'potential-cooking')
}

// Helper to check if has generated event
const hasGeneratedEvent = (eventLists: DayEventList[]) => {
  return eventLists.some(list => list.listId === 'generated-events')
}
</script>

<template>
  <BaseCalendar :season-dates="seasonDates" :event-lists="allEventLists">
    <template #day="{ day, eventLists }">
      <!-- Holiday takes precedence (green ring) -->
      <div
        v-if="isHoliday(day)"
        :class="dayCircleClasses(CALENDAR.holiday)"
      >
        {{ day.day }}
      </div>

      <!-- Potential cooking day with optional generated event (filled vs outline) -->
      <div
        v-else-if="hasPotentialCooking(eventLists)"
        :class="dayCircleClasses(hasGeneratedEvent(eventLists) ? PLANNING_CALENDAR.day.generated : PLANNING_CALENDAR.day.potential)"
      >
        {{ day.day }}
      </div>

      <!-- Regular day -->
      <span v-else class="text-sm">{{ day.day }}</span>
    </template>
  </BaseCalendar>
</template>
