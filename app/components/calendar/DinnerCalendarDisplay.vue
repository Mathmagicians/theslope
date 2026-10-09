<script setup lang="ts">
/**
 * DinnerCalendarDisplay - Dinner calendar with countdown timer
 *
 * Layout (Monitor Style):
 * ┌─────────────────────────────────────────────────────────────┐
 * │  | { label: string; type: 'circle'; circleClass: string[] }            COUNTDOWN TIMER (Train Station Style)          │
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
import type {CalendarLegendItem} from '~/components/calendar/CalendarLegend.vue'
import type {ReleasedTicketCounts} from '~/composables/useBooking'
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
  /** Lock status map keyed by dinner event ID (null = not locked, counts = locked with breakdown) */
  lockStatus?: Map<number, ReleasedTicketCounts | null>
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

const {getHolidayDatesFromDateRangeList} = useSeason()
const {useTemporalSplit, createTemporalEventLists} = useTemporalCalendar()
const {CALENDAR, DINNER_CALENDAR, SIZES, ICONS, BOOKING_LOCK_STATUS, getLockStatusConfig, dayCircleClasses} = useTheSlopeDesignSystem()

const holidayDates = computed(() => getHolidayDatesFromDateRangeList(props.holidays))

// Temporal splitting using shared composable (DRY with ChefCalendarDisplay)
const {
  nextDinner,
  pastDinnerDates,
  futureDinnerDates,
  dinnerStartHour
} = useTemporalSplit(() => props.dinnerEvents ?? [])

// Create event lists with dynamic color from props
const allEventLists = computed(() =>
    createTemporalEventLists(pastDinnerDates.value, futureDinnerDates.value, nextDinner.value, props.color)
)

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
// Returns both config and count (same pattern as BookingGridView.getEventLockStatus)
const getLockStatusForDay = (day: DateValue): { config: NonNullable<ReturnType<typeof getLockStatusConfig>>, count: number } | null => {
  if (!props.lockStatus) return null
  const dinner = getDinnerForDay(day)
  if (!dinner) return null
  const released = props.lockStatus.get(dinner.id) ?? null
  if (released === null) return null
  const config = getLockStatusConfig(released.total)
  return config ? { config, count: released.total } : null
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

// Legend items: the lock chips wrap a planned-day circle at the lock chip's size, as the day cells do
const legendItems = computed((): CalendarLegendItem[] => {
  const items: CalendarLegendItem[] = [
    { label: 'Næste fællesspisning', kind: 'circle', circleClass: dayCircleClasses(DINNER_CALENDAR.day.next) },
    { label: 'Valgt dato', kind: 'circle', circleClass: dayCircleClasses(DINNER_CALENDAR.day.next, DINNER_CALENDAR.selection) },
    { label: 'Planlagt fællesspisning', kind: 'circle', circleClass: dayCircleClasses(DINNER_CALENDAR.day.future) },
    { label: 'Tidligere fællesspisning', kind: 'circle', circleClass: dayCircleClasses(CALENDAR.day.past) },
    { label: 'Ferie', kind: 'circle', circleClass: dayCircleClasses(CALENDAR.holiday) }
  ]

  if (props.lockStatus) {
    const chipCircle = dayCircleClasses(DINNER_CALENDAR.day.future)
    items.push(
      { label: 'Lukket for framelding', kind: 'chip', chipColor: BOOKING_LOCK_STATUS.locked.color, circleClass: chipCircle, chipSize: SIZES.lockChip },
      { label: 'Ledige billetter', kind: 'chip', chipColor: BOOKING_LOCK_STATUS.lockedWithTickets.color, circleClass: chipCircle, chipSize: SIZES.lockChip, showCount: true }
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

    <!-- Calendar Accordion with custom leading slot -->
    <UAccordion v-model="accordionValue" :items="accordionItems" class="flex-1">
      <template #leading>
        <div class="flex items-center gap-2">
          <UIcon :name="ICONS.calendarDays" />
          <span>Fællesspisninger</span>
        </div>
      </template>
      <template #calendar-content>
        <!-- Calendar Display -->
        <div class="flex-1">
          <BaseCalendar :season-dates="seasonDates" :event-lists="allEventLists" :number-of-months="numberOfMonths" :focus-date="selectedDate">
            <template #day="{ day, eventLists }">
              <!-- Holiday takes precedence (green ring) -->
              <div
                v-if="isHoliday(day)"
                :class="dayCircleClasses(CALENDAR.holiday)"
              >
                {{ day.day }}
              </div>

              <!-- Locked dinner with chip (next/future, not past) -->
              <UChip
                v-else-if="getLockStatusForDay(day) && getDayType(eventLists) !== 'past'"
                show
                :size="SIZES.lockChip"
                :color="getLockStatusForDay(day)!.config.color"
                :text="getLockStatusForDay(day)!.count > 0 ? String(getLockStatusForDay(day)!.count) : undefined"
                :data-testid="`calendar-dinner-date-${day.day}`"
              >
                <div
                  :class="dayCircleClasses(getDayColorClass(getDayType(eventLists)!), isSelected(day) && DINNER_CALENDAR.selection)"
                  @click="handleDateClick(day)"
                >
                  {{ day.day }}
                </div>
              </UChip>

              <!-- Regular dinner event (next/future/past) - no lock -->
              <div
                v-else-if="getDayType(eventLists)"
                :data-testid="`calendar-dinner-date-${day.day}`"
                :class="dayCircleClasses(getDayColorClass(getDayType(eventLists)!), isSelected(day) && DINNER_CALENDAR.selection)"
                @click="handleDateClick(day)"
              >
                {{ day.day }}
              </div>

              <!-- Regular day -->
              <span v-else class="text-sm">{{ day.day }}</span>
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
