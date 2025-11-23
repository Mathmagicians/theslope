<script setup lang="ts">
/**
 * BaseCalendar - Renderless calendar foundation with slot-based rendering
 *
 * Provides:
 * - UCalendar structure with common configuration
 * - Event map for efficient day lookup (multiple event lists support)
 * - Responsive sizing based on breakpoint (xl/3 months on desktop, sm/1 month on mobile)
 * - Consistent UI (hides days outside current view)
 * - Scoped slots for custom domain-specific rendering
 *
 * Domain-specific calendars use this component to avoid duplication while
 * maintaining full control over rendering logic via slots.
 *
 * Architecture: ADR-007 (separation of concerns), ADR-010 (domain types)
 */
import type {DateRange} from '~/types/dateTypes'
import type {CalendarEventList, DayEventList} from '~/composables/useCalendarEvents'
import type {DateValue} from "@internationalized/date"
import {toCalendarDateRange, translateToDanish} from "~/utils/date"

interface Props {
  seasonDates: DateRange
  eventLists: CalendarEventList[]
  numberOfMonths?: number // Override responsive behavior (defaults to 3 on desktop, 1 on mobile)
}

interface Slots {
  day?: (props: { day: DateValue, eventLists: DayEventList[] }) => unknown
  'week-day'?: (props: { day: string }) => unknown
  legend?: () => unknown  // Optional legend slot (only shown if defined)
}

const props = defineProps<Props>()
defineSlots<Slots>()

const {createEventMap, getEventListsForDay: getEventListsForDayFromComposable} = useCalendarEvents()

// Convert season dates to CalendarDate format for UCalendar
const seasonDatesAsCalendarDates = computed(() => toCalendarDateRange(props.seasonDates))

// Create event map for efficient day lookup
const eventMap = computed(() => createEventMap(props.eventLists))

// Get all event lists with events for a specific day (delegates to composable)
const getEventListsForDay = (day: DateValue): DayEventList[] => {
  return getEventListsForDayFromComposable(day, props.eventLists, eventMap.value)
}

// Responsive sizing
const isMd = inject<Ref<boolean>>('isMd')
const getIsMd = computed((): boolean => isMd?.value ?? false)

// Number of months to display (can be overridden via prop)
const monthsToDisplay = computed(() => {
  if (props.numberOfMonths !== undefined) {
    return props.numberOfMonths
  }
  return getIsMd.value ? 3 : 1
})

// Consistent UI - hide days outside current month view
const calendarUi = {
  cellTrigger: 'data-[outside-view]:hidden'
}
</script>

<template>
  <div>
    <UCalendar
        :size="getIsMd ? 'xl': 'sm'"
        :number-of-months="monthsToDisplay"
        :min-value="seasonDatesAsCalendarDates.start"
        :max-value="seasonDatesAsCalendarDates.end"
        :week-starts-on="1"
        :fixed-weeks="false"
        :disable-days-outside-current-view="true"
        :ui="calendarUi"
        weekday-format="short"
        readonly
    >
      <!-- Day slot - pass day and event lists to wrapper for custom rendering -->
      <template #day="{ day }">
        <slot name="day" :day="day" :event-lists="getEventListsForDay(day)">
          <!-- Default: Just show day number -->
          <span class="text-sm">{{ day.day }}</span>
        </slot>
      </template>

      <!-- Week day slot - pass day for custom weekday labels -->
      <template #week-day="{ day }">
        <slot name="week-day" :day="day">
          <!-- Default: Danish abbreviated weekday -->
          <span class="text-sm text-muted uppercase">
            {{ translateToDanish(day) }}
          </span>
        </slot>
      </template>
    </UCalendar>

    <!-- Legend slot - only shown if defined -->
    <slot v-if="$slots.legend" name="legend" />
  </div>
</template>