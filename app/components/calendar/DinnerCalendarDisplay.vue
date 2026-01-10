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
 * - Holidays (green rings)
 * - Generated dinner events (pink filled) - actual events created for the season
 * - Next dinner (special highlight) - uses color from 'next-dinner' event list
 * - Lock chips (optional) - red for locked, yellow for locked with tickets available
 *
 * Uses BaseCalendar for consistent calendar structure and event management.
 * Domain-specific rendering via slots (rings for holidays, filled for actual).
 */
import type {DateRange} from '~/types/dateTypes'
import type {DateValue} from '@internationalized/date'
import type {DinnerEventDisplay} from '~/composables/useBookingValidation'
import type {DayEventList} from '~/composables/useCalendarEvents'
import type {NuxtUIColor} from '~/composables/useTheSlopeDesignSystem'
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
  /** Lock status map keyed by dinner event ID (null = not locked, 0 = locked, >0 = tickets available) */
  lockStatus?: Map<number, number | null>
}

const props = withDefaults(defineProps<Props>(), {
  dinnerEvents: () => [],
  numberOfMonths: 1,
  showCountdown: false,
  color: 'peach',
  useRings: false,
  selectedDate: undefined,
  lockStatus: undefined
})

const {createEventList} = useCalendarEvents()
const {
  getHolidayDatesFromDateRangeList,
  getDefaultDinnerStartTime,
  getNextDinnerDate,
  splitDinnerEvents
} = useSeason()
const {CALENDAR, DINNER_CALENDAR, SIZES, BOOKING_LOCK_STATUS, getLockStatusConfig} = useTheSlopeDesignSystem()

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

// Get dinner event for a specific day
const getDinnerForDay = (day: DateValue): DinnerEventDisplay | undefined => {
  const dayDate = toDate(day)
  return props.dinnerEvents?.find(event =>
    dayDate.toDateString() === new Date(event.date).toDateString()
  )
}

// Get lock status config for a day (null if not locked or no lockStatus provided)
const getLockStatusForDay = (day: DateValue) => {
  if (!props.lockStatus) return null
  const dinner = getDinnerForDay(day)
  if (!dinner) return null
  const releasedCount = props.lockStatus.get(dinner.id)
  if (releasedCount === undefined) return null
  return getLockStatusConfig(releasedCount)
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

// Legend item types
type LegendItem =
  | { label: string; type: 'circle'; circleClass: string }
  | { label: string; type: 'chip'; chipColor: NuxtUIColor }

// Legend items using design system classes
const legendItems = computed((): LegendItem[] => {
  const items: LegendItem[] = [
    { label: 'Næste fællesspisning', type: 'circle', circleClass: `${SIZES.calendarCircle} ${CALENDAR.day.shape} ${DINNER_CALENDAR.day.next}` },
    { label: 'Valgt dato', type: 'circle', circleClass: `${SIZES.calendarCircle} ${CALENDAR.day.shape} ${DINNER_CALENDAR.day.next} ${DINNER_CALENDAR.selection}` },
    { label: 'Planlagt fællesspisning', type: 'circle', circleClass: `${SIZES.calendarCircle} ${CALENDAR.day.shape} ${DINNER_CALENDAR.day.future}` },
    { label: 'Tidligere fællesspisning', type: 'circle', circleClass: `${SIZES.calendarCircle} ${CALENDAR.day.shape} ${CALENDAR.day.past}` },
    { label: 'Ferie', type: 'circle', circleClass: `${SIZES.calendarCircle} ${CALENDAR.day.shape} ${CALENDAR.holiday}` }
  ]

  if (props.lockStatus) {
    items.push(
      { label: 'Lukket for framelding', type: 'chip', chipColor: BOOKING_LOCK_STATUS.locked.color },
      { label: 'Ledige billetter', type: 'chip', chipColor: BOOKING_LOCK_STATUS.lockedWithTickets.color }
    )
  }

  return items
})

const emit = defineEmits<{
  'date-selected': [date: Date]
}>()

// Calendar open state - parent controls via v-model:calendar-open
const calendarOpen = defineModel<boolean>('calendarOpen', { default: true })

// Accordion items with value for v-model binding
const accordionItems = [{ label: 'Kalender', slot: 'calendar-content', value: '0' }]

// Bridge between boolean model and accordion string value
const accordionValue = computed({
  get: () => calendarOpen.value ? '0' : undefined,
  set: (v) => { calendarOpen.value = v === '0' }
})

const handleDateClick = (day: DateValue) => {
  emit('date-selected', toDate(day))
}

const handleCountdownClick = (dinnerId: number) => {
  const dinner = props.dinnerEvents?.find(e => e.id === dinnerId)
  if (dinner) {
    emit('date-selected', new Date(dinner.date))
  }
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
      clickable
      @select="handleCountdownClick"
    />

    <!-- Calendar Accordion (parent controls open state via v-model:calendar-open) -->
    <UAccordion v-model="accordionValue" :items="accordionItems" class="flex-1">
      <template #calendar-content>
        <!-- Calendar Display -->
        <div class="flex-1">
          <BaseCalendar :season-dates="seasonDates" :event-lists="allEventLists" :number-of-months="numberOfMonths" :focus-date="selectedDate">
            <template #day="{ day, eventLists }">
              <!-- Holiday takes precedence (green ring) -->
              <div
                v-if="isHoliday(day)"
                :class="[SIZES.calendarCircle, CALENDAR.day.shape, CALENDAR.holiday]"
              >
                {{ day.day }}
              </div>

              <!-- Locked dinner with chip (next/future, not past) -->
              <UChip
                v-else-if="getLockStatusForDay(day) && getDayType(eventLists) !== 'past'"
                show
                size="md"
                :color="getLockStatusForDay(day)!.color"
                :data-testid="`calendar-dinner-date-${day.day}`"
              >
                <div
                  :class="[SIZES.calendarCircle, CALENDAR.day.shape, getDayColorClass(getDayType(eventLists)!), isSelected(day) ? DINNER_CALENDAR.selection : '']"
                  @click="handleDateClick(day)"
                >
                  {{ day.day }}
                </div>
              </UChip>

              <!-- Regular dinner event (next/future/past) - no lock -->
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
                  <!-- Chip for lock indicators -->
                  <UChip v-if="legendItem.type === 'chip'" show size="md" :color="legendItem.chipColor">
                    1
                  </UChip>
                  <!-- Circle for other indicators -->
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
