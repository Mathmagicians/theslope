<script setup lang="ts">
/**
 * HouseholdCalendarDisplay - Shows household bookings and cooking obligations
 *
 * Displays:
 * - Holidays (green rings)
 * - Team cooking days (◆ symbol when household member cooks)
 * - Bookings (● symbol when family members have bookings)
 * - Not booked (○ symbol for potential booking days without bookings)
 *
 * Uses BaseCalendar for consistent calendar structure.
 * Shows 1 month at a time (master calendar in master-detail layout).
 */
import type {DateRange} from '~/types/dateTypes'
import type {DayEventList} from '~/composables/useCalendarEvents'
import type {DateValue} from '@internationalized/date'
import {isCalendarDateInDateList} from '~/utils/date'

interface Inhabitant {
  id: number
  name: string
}

interface Household {
  id: number
  name: string
  inhabitants: Inhabitant[]
}

interface DinnerEvent {
  id: number
  date: Date
  cookingTeamId: number | null
}

interface Order {
  id: number
  dinnerEventId: number
  inhabitantId: number
}

interface Props {
  seasonDates: DateRange
  household: Household
  dinnerEvents: DinnerEvent[]
  orders: Order[]
  holidays?: DateRange[]
}

const props = defineProps<Props>()
const {createEventList} = useCalendarEvents()
const {getHolidayDatesFromDateRangeList} = useSeason()
const {CALENDAR, SIZES} = useTheSlopeDesignSystem()

// Expand holiday ranges into individual dates
const holidayDates = computed(() => {
  if (!props.holidays || props.holidays.length === 0) return []
  return getHolidayDatesFromDateRangeList(props.holidays)
})

// Find events where household members are cooking (team assignments)
const teamCookingDates = computed(() => {
  // TODO: Filter dinnerEvents where cookingTeam contains household inhabitants
  // For now, return empty array - will implement with full team data
  return []
})

// Find events with household bookings
const bookingDates = computed(() => {
  const eventIdsWithBookings = new Set(props.orders.map(o => o.dinnerEventId))
  return props.dinnerEvents
    .filter(event => eventIdsWithBookings.has(event.id))
    .map(event => event.date)
})

// Transform into event lists for BaseCalendar
const teamCookingEventList = computed(() =>
  createEventList(teamCookingDates.value, 'team-cooking', 'badge', {
    label: 'Hold laver mad'
  })
)

const bookingEventList = computed(() =>
  createEventList(bookingDates.value, 'bookings', 'chip')
)

// Combine all event lists
const allEventLists = computed(() => [
  teamCookingEventList.value,
  bookingEventList.value
])

// Check if a day is a holiday
const isHoliday = (day: DateValue): boolean => {
  return isCalendarDateInDateList(day, holidayDates.value)
}

// Helper to check if household is cooking
const hasTeamCooking = (eventLists: DayEventList[]) => {
  return eventLists.some(list => list.listId === 'team-cooking')
}

// Helper to check if household has bookings
const hasBookings = (eventLists: DayEventList[]) => {
  return eventLists.some(list => list.listId === 'bookings')
}
</script>

<template>
  <BaseCalendar
    :season-dates="seasonDates"
    :event-lists="allEventLists"
    :number-of-months="1"
  >
    <template #day="{ day, eventLists }">
      <!-- Holiday takes precedence (green ring) -->
      <div
        v-if="isHoliday(day)"
        :class="[SIZES.calendarCircle, CALENDAR.day.shape, CALENDAR.holiday]"
      >
        {{ day.day }}
      </div>

      <!-- Team cooking day -->
      <div
v-else-if="hasTeamCooking(eventLists)"
           class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium bg-orange-600 text-white">
        <span class="text-xs">◆</span>{{ day.day }}
      </div>

      <!-- Has bookings -->
      <div
v-else-if="hasBookings(eventLists)"
           class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium bg-blue-600 text-white">
        <span class="text-xs">●</span>{{ day.day }}
      </div>

      <!-- Regular day -->
      <span v-else class="text-sm">{{ day.day }}</span>
    </template>
  </BaseCalendar>
</template>