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
 * │  │ 15  16 [17]n 18w 19* 20  21             │                │
 * │  │ 22  -23- 24  25  26  27  28             │                │
 * │  └─────────────────────────────────────────┘                │
 * │  Forklaring                                                 │
 * │  (1) Næste fællesspisning   (1) Valgt dato                  │
 * │  (1) Planlagt fællesspisning   (1) Tidligere fællesspisning │
 * │  -(1)- Aflyst fællesspisning                                │
 * │  (1) Ferie                                                  │
 * │  (1)*  Lukket for framelding                                │
 * │  (1)n  Ledige billetter                                     │
 * │  (1)w  Venteliste, ingen ledige billetter                   │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Lock chips (SIZES.lockChip), on a dinner past its booking deadline until the dinner starts (`lockChip`):
 *   n = yellow, reading the tickets for sale
 *   w = yellow, the hourglass ICONS.waitlist inset in a chip a size up (COMPONENTS.dinnerCalendar.queueChip): a waiting list, nothing for sale
 *   * = peach, no number: closed, nothing for sale and nobody waiting
 * The legend (CalendarLegend) draws each chip on a planned-day circle, the hourglass chip at COMPONENTS.legend.iconChip.
 *
 * -23- = a cancelled dinner: the past circle struck through (CALENDAR.day.past + CALENDAR.day.cancelled), as the chef
 * calendar draws it, whether past or upcoming, and without a lock chip.
 *
 * Displays:
 * - Countdown timer (train station style, CountdownTimer's dinner palette)
 * - Holidays (green rings)
 * - Generated dinner events (peach filled, DINNER_CALENDAR.day.future) - actual events created for the season
 * - Next dinner (special highlight, DINNER_CALENDAR.day.next)
 *
 * Uses BaseCalendar for consistent calendar structure and event management.
 * Domain-specific rendering via slots (rings for holidays, filled for actual).
 */
import type {DateRange} from '~/types/dateTypes'
import type {DateValue} from '@internationalized/date'
import type {DinnerEventDisplay} from '~/composables/useBookingValidation'
import type {DayEventList} from '~/composables/useCalendarEvents'
import {LEGEND_KIND, type CalendarLegendItem} from '~/components/calendar/CalendarLegend.vue'
import {COUNTDOWN_PALETTE} from '~/components/calendar/CountdownTimer.vue'
import type {ReleasedTicketCounts} from '~/composables/useBooking'
import {isSameDay} from 'date-fns'
import {BOOKING_WORDS} from '~/config/bookingWords'
import {DATE_WORDS} from '~/config/dateWords'

interface Props {
  seasonDates: DateRange
  holidays: DateRange[]
  dinnerEvents?: DinnerEventDisplay[]
  numberOfMonths?: number
  showCountdown?: boolean
  selectedDate?: Date
  /** Lock status map keyed by dinner event ID (null = not locked, counts = locked with breakdown) */
  lockStatus?: Map<number, ReleasedTicketCounts | null>
}

const props = withDefaults(defineProps<Props>(), {
  dinnerEvents: () => [],
  numberOfMonths: 1,
  showCountdown: false,
  selectedDate: undefined,
  lockStatus: undefined
})

const {getHolidayDatesFromDateRangeList} = useSeason()
const {useTemporalSplit, createTemporalEventLists, dayTypeOf, getDinnerForDay, isCancelledDay} = useTemporalCalendar()
const {CALENDAR, DINNER_CALENDAR, COMPONENTS, SIZES, ICONS, BOOKING_LOCK_STATUS, dayCircleClasses, dayColorClass} = useTheSlopeDesignSystem()
const {lockChip} = useBookingUi()
const now = useClock()

const holidayDates = computed(() => getHolidayDatesFromDateRangeList(props.holidays))

// Temporal splitting using shared composable (DRY with ChefCalendarDisplay)
const {
  nextDinner,
  pastDinnerDates,
  futureDinnerDates,
  dinnerStartHour
} = useTemporalSplit(() => props.dinnerEvents ?? [])

const allEventLists = computed(() =>
    createTemporalEventLists(pastDinnerDates.value, futureDinnerDates.value, nextDinner.value)
)

const isHoliday = (day: DateValue): boolean => {
  return isCalendarDateInDateList(day, holidayDates.value)
}

// The lock chip of the day's dinner; null without a lock status, a locked dinner on the day, or from the dinner's start
const getLockChipForDay = (day: DateValue) => {
  if (!props.lockStatus) return null
  const dinner = getDinnerForDay(props.dinnerEvents, day)
  return dinner ? lockChip(dinner, props.lockStatus, now.value) : null
}

// The day read once per cell, keyed by its date, so the template narrows its dinner type and its lock chip
const dayCellOf = (day: DateValue, eventLists: DayEventList[]) => ({key: day.toString(), type: dayTypeOf(eventLists), chip: getLockChipForDay(day)})

// Legend items: the lock chips wrap a planned-day circle at the lock chip's size, as the day cells do
const legendItems = computed((): CalendarLegendItem[] => {
  const words = BOOKING_WORDS.calendarLegend
  const items: CalendarLegendItem[] = [
    { label: words.next, kind: LEGEND_KIND.circle, circleClass: dayCircleClasses(DINNER_CALENDAR.day.next) },
    { label: DATE_WORDS.calendarLegend.selected, kind: LEGEND_KIND.circle, circleClass: dayCircleClasses(DINNER_CALENDAR.day.next, DINNER_CALENDAR.selection) },
    { label: words.planned, kind: LEGEND_KIND.circle, circleClass: dayCircleClasses(DINNER_CALENDAR.day.future) },
    { label: words.past, kind: LEGEND_KIND.circle, circleClass: dayCircleClasses(CALENDAR.day.past) },
    { label: BOOKING_WORDS.cancelledDinner.legend, kind: LEGEND_KIND.circle, circleClass: dayCircleClasses(CALENDAR.day.past, CALENDAR.day.cancelled) },
    { label: DATE_WORDS.calendarLegend.holiday, kind: LEGEND_KIND.circle, circleClass: dayCircleClasses(CALENDAR.holiday) }
  ]

  if (props.lockStatus) {
    const chipCircle = dayCircleClasses(DINNER_CALENDAR.day.future)
    items.push(
      { label: DEADLINE_LABELS.BOOKING_CLOSED.closedText, kind: LEGEND_KIND.chip, chipColor: BOOKING_LOCK_STATUS.locked.color, circleClass: chipCircle, chipSize: SIZES.lockChip },
      { label: words.forSale, kind: LEGEND_KIND.chip, chipColor: BOOKING_LOCK_STATUS.lockedWithTickets.color, circleClass: chipCircle, chipSize: SIZES.lockChip, count: '1' },
      { label: words.waitlist, kind: LEGEND_KIND.chip, chipColor: BOOKING_LOCK_STATUS.lockedWithQueue.color, circleClass: chipCircle, chipSize: SIZES.lockChip, icon: BOOKING_LOCK_STATUS.lockedWithQueue.icon }
    )
  }

  return items
})

const emit = defineEmits<{
  'date-selected': [date: Date]
}>()

// Calendar open state - parent controls via v-model:calendar-open
const calendarOpen = defineModel<boolean>('calendarOpen', { default: true })

// Accordion item (no label - using custom leading slot)
const accordionItems = [{ slot: 'calendar-content', value: '0' }]
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
    emit('date-selected', dinner.date)
  }
}

const isSelected = (day: DateValue): boolean => {
  if (!props.selectedDate) return false
  return isSameDay(toDate(day), props.selectedDate)
}
</script>

<template>
  <div :class="COMPONENTS.dinnerCalendar.root">
    <!-- Countdown Timer (Train Station Style) -->
    <CountdownTimer
      v-if="showCountdown"
      :title="BOOKING_WORDS.calendar.countdownTitle"
      :time-label="BOOKING_WORDS.calendar.countdownTimeLabel"
      :empty-text="DATE_WORDS.countdown.none"
      :next-event="nextDinner"
      :event-start-hour="dinnerStartHour"
      :palette="COUNTDOWN_PALETTE.dinner"
      clickable
      @select="handleCountdownClick"
    />

    <!-- Calendar Accordion with custom leading slot -->
    <UAccordion v-model="accordionValue" :items="accordionItems" :class="COMPONENTS.dinnerCalendar.accordion">
      <template #leading>
        <div :class="COMPONENTS.dinnerCalendar.leading">
          <UIcon :name="ICONS.calendarDays" />
          <span>{{ BOOKING_WORDS.calendar.title }}</span>
        </div>
      </template>
      <template #calendar-content>
        <!-- Calendar Display -->
        <div :class="COMPONENTS.dinnerCalendar.calendar">
          <BaseCalendar :season-dates="seasonDates" :event-lists="allEventLists" :number-of-months="numberOfMonths" :focus-date="selectedDate">
            <template #day="{ day, eventLists }">
              <template v-for="{key, type, chip} in [dayCellOf(day, eventLists)]" :key="key">
                <!-- Holiday takes precedence (green ring) -->
                <div
                  v-if="isHoliday(day)"
                  :class="dayCircleClasses(CALENDAR.holiday)"
                >
                  {{ day.day }}
                </div>

                <!-- Cancelled dinner: the past circle struck through, as the chef calendar draws it, and no lock chip -->
                <div
                  v-else-if="isCancelledDay(dinnerEvents, day)"
                  :data-testid="`calendar-dinner-date-${day.day}`"
                  :class="dayCircleClasses(CALENDAR.day.past, CALENDAR.day.cancelled, isSelected(day) && DINNER_CALENDAR.selection)"
                  @click="handleDateClick(day)"
                >
                  {{ day.day }}
                </div>

                <!-- Locked dinner with chip, until the dinner starts -->
                <UChip
                  v-else-if="chip && type"
                  show
                  :size="SIZES.lockChip"
                  :color="chip.color"
                  :text="chip.text"
                  :ui="chip.icon ? COMPONENTS.dinnerCalendar.queueChip.ui : undefined"
                  :data-testid="`calendar-dinner-date-${day.day}`"
                >
                  <div
                    :class="dayCircleClasses(dayColorClass(DINNER_CALENDAR, type), isSelected(day) && DINNER_CALENDAR.selection)"
                    @click="handleDateClick(day)"
                  >
                    {{ day.day }}
                  </div>
                  <template v-if="chip.icon" #content>
                    <UIcon
                      :name="chip.icon"
                      :class="COMPONENTS.dinnerCalendar.queueChip.icon"
                      :data-testid="`calendar-dinner-waitlist-${day.day}`"
                    />
                  </template>
                </UChip>

                <!-- Regular dinner event (next/future/past) - no lock -->
                <div
                  v-else-if="type"
                  :data-testid="`calendar-dinner-date-${day.day}`"
                  :class="dayCircleClasses(dayColorClass(DINNER_CALENDAR, type), isSelected(day) && DINNER_CALENDAR.selection)"
                  @click="handleDateClick(day)"
                >
                  {{ day.day }}
                </div>

                <!-- Regular day -->
                <span v-else :class="COMPONENTS.dinnerCalendar.plainDay">{{ day.day }}</span>
              </template>
            </template>

            <template #legend>
              <CalendarLegend :items="legendItems" />
            </template>
          </BaseCalendar>
        </div>
      </template>
    </UAccordion>
  </div>
</template>
