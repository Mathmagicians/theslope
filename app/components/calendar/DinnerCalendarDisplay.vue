<script setup lang="ts">
/**
 * DinnerCalendarDisplay - Dinner calendar with countdown timer
 *
 * Layout (Monitor Style):
 * ┌─────────────────────────────────────────────────────────────┐
 * │              COUNTDOWN TIMER (Train Station Style)          │
 * │  ┌───────────────────────────────────────────────────────┐  │
 * │  │         DAGENS FÆLLESSPISNING                         │  │
 * │  │              MAN 15/11                                │  │
 * │  │            OM 2T 15M                                  │  │
 * │  │              18:00                                    │  │
 * │  └───────────────────────────────────────────────────────┘  │
 * ├─────────────────────────────────────────────────────────────┤
 * │              CALENDAR DISPLAY                               │
 * │  ┌─────────────────────────────────────────┐                │
 * │  │  M   T   O   T   F   L   S              │                │
 * │  │  1   2   3   4   5   6   7              │                │
 * │  │  8  [9] 10  11  12  13  14              │                │
 * │  │ 15  16 [17] 18  19  20  21              │                │
 * │  └─────────────────────────────────────────┘                │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Displays:
 * - Countdown timer (train station style with configurable colors from event list)
 * - Holidays (green chips)
 * - Generated dinner events (pink filled) - actual events created for the season
 * - Next dinner (special highlight) - uses color from 'next-dinner' event list
 *
 * Uses BaseCalendar for consistent calendar structure and event management.
 * Domain-specific rendering via slots (chips for holidays, filled for actual).
 */
import type {DateRange} from '~/types/dateTypes'
import type {DateValue} from '@internationalized/date'
import type {DinnerEventDisplay} from '~/composables/useBookingValidation'
import type {DayEventList} from '~/composables/useCalendarEvents'
import {isCalendarDateInDateList, toDate} from '~/utils/date'

interface Props {
  seasonDates: DateRange
  holidays: DateRange[]
  dinnerEvents?: DinnerEventDisplay[]
  numberOfMonths?: number
  showCountdown?: boolean
  color?: string
  useRings?: boolean
  selectedDate?: Date
}

const props = withDefaults(defineProps<Props>(), {
  dinnerEvents: () => [],
  numberOfMonths: 1,
  showCountdown: false,
  color: 'peach',
  useRings: false,
  selectedDate: undefined
})

const {createEventList} = useCalendarEvents()
const {
  getHolidayDatesFromDateRangeList,
  getDefaultDinnerStartTime,
  getNextDinnerDate,
  splitDinnerEvents
} = useSeason()
const {CALENDAR, DINNER_CALENDAR, SIZES} = useTheSlopeDesignSystem()

const holidayDates = computed(() => getHolidayDatesFromDateRangeList(props.holidays))
const dinnerDates = computed(() => props.dinnerEvents?.map(e => new Date(e.date)) ?? [])
const dinnerStartHour = getDefaultDinnerStartTime()
const nextDinnerDateRange = computed(() => getNextDinnerDate(dinnerDates.value, dinnerStartHour))

const splitResult = computed(() =>
    splitDinnerEvents<DinnerEventDisplay>(props.dinnerEvents ?? [], nextDinnerDateRange.value)
)

const nextDinner = computed(() => splitResult.value.nextDinner)
const pastDinnerDates = computed(() => splitResult.value.pastDinnerDates)
const futureDinnerDates = computed(() => splitResult.value.futureDinnerDates)

const pastDinnersEventList = computed(() =>
    createEventList(pastDinnerDates.value, 'past-dinners', 'badge', {
      color: 'mocha'
    })
)

const futureDinnersEventList = computed(() =>
    createEventList(futureDinnerDates.value, 'future-dinners', 'badge', {
      color: props.color
    })
)

const nextDinnerEventList = computed(() => {
  if (!nextDinner.value) return createEventList([], 'next-dinner', 'badge')
  return createEventList([nextDinner.value.date], 'next-dinner', 'badge', {
    color: props.color
  })
})

const allEventLists = computed(() => {
  return [
    pastDinnersEventList.value,
    futureDinnersEventList.value,
    nextDinnerEventList.value
  ]
})

const isHoliday = (day: DateValue): boolean => {
  return isCalendarDateInDateList(day, holidayDates.value)
}

// Day type detection - returns 'next' | 'future' | 'past' | null
type DayType = 'next' | 'future' | 'past'
const getDayType = (eventLists: DayEventList[]): DayType | null => {
  if (eventLists.some(list => list.listId === 'next-dinner')) return 'next'
  if (eventLists.some(list => list.listId === 'future-dinners')) return 'future'
  if (eventLists.some(list => list.listId === 'past-dinners')) return 'past'
  return null
}

// Get day color class (past is shared, next/future are palette-specific)
const getDayColorClass = (type: DayType): string => {
  return type === 'past' ? CALENDAR.day.past : DINNER_CALENDAR.day[type]
}

// Legend items using design system classes
const legendItems = computed(() => [
  {
    label: 'Næste fællesspisning',
    type: 'circle' as const,
    circleClass: `${SIZES.calendarCircle} ${CALENDAR.day.shape} ${DINNER_CALENDAR.day.next}`
  },
  {
    label: 'Valgt dato',
    type: 'circle' as const,
    circleClass: `${SIZES.calendarCircle} ${CALENDAR.day.shape} ${DINNER_CALENDAR.day.next} ${DINNER_CALENDAR.selection}`
  },
  {
    label: 'Planlagt fællesspisning',
    type: 'circle' as const,
    circleClass: `${SIZES.calendarCircle} ${CALENDAR.day.shape} ${DINNER_CALENDAR.day.future}`
  },
  {
    label: 'Tidligere fællesspisning',
    type: 'circle' as const,
    circleClass: `${SIZES.calendarCircle} ${CALENDAR.day.shape} ${CALENDAR.day.past}`
  },
  {
    label: 'Ferie',
    type: 'chip' as const
  }
])

const accordionItems = [{
  label: 'Kalender',
  slot: 'calendar-content'
}]

const emit = defineEmits<{
  'date-selected': [date: Date]
}>()

const handleDateClick = (day: DateValue) => {
  emit('date-selected', toDate(day))
}

const isSelected = (day: DateValue): boolean => {
  if (!props.selectedDate) return false
  const dayDate = toDate(day)
  return dayDate.toDateString() === props.selectedDate.toDateString()
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Countdown Timer (Train Station Style) -->
    <CountdownTimer
      v-if="showCountdown"
      title="Næste Fællesspisning"
      time-label="spisning"
      empty-text="Ingen"
      :next-event="nextDinner"
      :event-start-hour="dinnerStartHour"
      palette="dinner"
    />

    <!-- Calendar Accordion (collapsed on mobile, open on desktop) -->
    <UAccordion :items="accordionItems" :default-value="SIZES.calendarAccordionDefault" type="single" collapsible class="flex-1">
      <template #calendar-content>
        <!-- Calendar Display -->
        <div class="flex-1">
          <BaseCalendar :season-dates="seasonDates" :event-lists="allEventLists" :number-of-months="numberOfMonths" :focus-date="selectedDate">
            <template #day="{ day, eventLists }">
              <!-- Holiday takes precedence -->
              <UChip v-if="isHoliday(day)" show size="md" color="success">
                {{ day.day }}
              </UChip>

              <!-- Dinner event (next/future/past) -->
              <div
                v-else-if="getDayType(eventLists)"
                :data-testid="`calendar-dinner-date-${day.day}`"
                :class="[
                  SIZES.calendarCircle,
                  CALENDAR.day.shape,
                  getDayColorClass(getDayType(eventLists)!),
                  isSelected(day) ? DINNER_CALENDAR.selection : ''
                ]"
                @click="handleDateClick(day)"
              >
                {{ day.day }}
              </div>

              <!-- Regular day -->
              <span v-else class="text-sm">{{ day.day }}</span>
            </template>

            <!-- Legend -->
            <template #legend>
              <div class="px-4 py-6 md:px-6 md:py-8 space-y-3 border-t mt-auto" :class="TYPOGRAPHY.bodyTextSmall">
                <div v-for="legendItem in legendItems" :key="legendItem.label" class="flex items-center gap-4">
                  <div v-if="legendItem.type === 'chip'" class="w-8 h-8 flex items-center justify-center">
                    <UChip show size="md" color="success">1</UChip>
                  </div>
                  <div v-else :class="legendItem.circleClass">
                    1
                  </div>
                  <span>{{ legendItem.label }}</span>
                </div>
              </div>
            </template>
          </BaseCalendar>
        </div>
      </template>
    </UAccordion>
  </div>
</template>
