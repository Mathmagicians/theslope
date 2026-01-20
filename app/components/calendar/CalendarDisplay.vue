<script setup lang="ts">
/**
 * CalendarDisplay - Shows potential cooking days and actual generated events
 *
 * Displays:
 * - Holidays (green rings)
 * - Potential cooking days (pink rings) - days matching cookingDays pattern minus holidays
 * - Generated dinner events (pink filled) - actual events created for the season
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
const {CALENDAR} = useTheSlopeDesignSystem()

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
        class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
        :class="CALENDAR.holiday"
      >
        {{ day.day }}
      </div>

      <!-- Potential cooking day with optional generated event (filled vs ring) -->
      <div
v-else-if="hasPotentialCooking(eventLists)"
           class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
           :class="hasGeneratedEvent(eventLists) ? 'bg-pink-800 text-pink-50' : 'border-2 border-pink-300 text-pink-800'">
        {{ day.day }}
      </div>

      <!-- Regular day -->
      <span v-else class="text-sm">{{ day.day }}</span>
    </template>
  </BaseCalendar>
</template>
