<script setup lang="ts">
/**
 * BaseCalendar - Renderless calendar foundation with slot-based rendering
 *
 * Provides:
 * - UCalendar structure with common configuration
 * - Event map for efficient day lookup (multiple event lists support)
 * - Responsive sizing via design system (SIZES.calendar, SIZES.calendarMonths)
 * - Consistent UI (hides days outside current view)
 * - Scoped slots for custom domain-specific rendering
 *
 * Domain-specific calendars use this component to avoid duplication while
 * maintaining full control over rendering logic via slots.
 */
import type {DateRange} from '~/types/dateTypes'
import type {CalendarEventList, DayEventList} from '~/composables/useCalendarEvents'
import type {DateValue} from "@internationalized/date"
import {toCalendarDate, toCalendarDateRange, translateToDanish} from "~/utils/date"

interface Props {
  seasonDates: DateRange
  eventLists: CalendarEventList[]
  numberOfMonths?: number // Override responsive behavior
  focusDate?: Date | null
}

interface Slots {
  day?: (props: { day: DateValue, eventLists: DayEventList[] }) => unknown
  'week-day'?: (props: { day: string }) => unknown
  legend?: () => unknown
}

const props = defineProps<Props>()
defineSlots<Slots>()

const {createEventMap, getEventListsForDay: getEventListsForDayFromComposable} = useCalendarEvents()
const {SIZES, COMPONENTS} = useTheSlopeDesignSystem()

const seasonDatesAsCalendarDates = computed(() => toCalendarDateRange(props.seasonDates))
const focusDateAsCalendarDate = computed(() => props.focusDate ? toCalendarDate(props.focusDate) : undefined)
const eventMap = computed(() => createEventMap(props.eventLists))

const getEventListsForDay = (day: DateValue): DayEventList[] => {
  return getEventListsForDayFromComposable(day, props.eventLists, eventMap.value)
}

const monthsToDisplay = computed(() => props.numberOfMonths ?? SIZES.calendarMonths)
</script>

<template>
  <div>
    <UCalendar
        :size="SIZES.calendar"
        :number-of-months="monthsToDisplay"
        :default-value="focusDateAsCalendarDate"
        :min-value="seasonDatesAsCalendarDates.start"
        :max-value="seasonDatesAsCalendarDates.end"
        :week-starts-on="1"
        :fixed-weeks="false"
        :disable-days-outside-current-view="true"
        :ui="COMPONENTS.calendar"
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