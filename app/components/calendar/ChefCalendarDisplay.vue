<script setup lang="ts">
/**
 * ChefCalendarDisplay - Chef cooking schedule with countdown and deadline tracking
 *
 * ┌──────────────────────────────────────────────────────────────┐
 * │           COUNTDOWN TIMER (Train Station Style)              │
 * │  ┌────────────────────────────────────────────────────────┐  │
 * │  │           NÆSTE MADLAVNING                             │  │
 * │  │              LØR 25/01                                 │  │
 * │  │           OM 2T 15M                                    │  │
 * │  │              18:00  ●                                  │  │
 * │  └────────────────────────────────────────────────────────┘  │
 * ├──────────────────────────────────────────────────────────────┤
 * │           [AGENDA] [KALENDER] ← View Toggle                  │
 * ├──────────────────────────────────────────────────────────────┤
 * │  CALENDAR VIEW                                               │
 * │  ┌────────────────────────────────────────┐                  │
 * │  │  M   T   O   T   F   L   S             │                  │
 * │  │  8   9  10  11  12  13  14             │                  │
 * │  │ 15 ⭕16 ⭕18  19  20  21  22            │                  │
 * │  │     🔴  🟡                              │  ← Rings        │
 * │  │ 22 ⭕25  26  27  28  29  30             │                  │
 * │  └────────────────────────────────────────┘                  │
 * ├──────────────────────────────────────────────────────────────┤
 * │  AGENDA VIEW (Same visual as calendar!)                      │
 * │  ┌────────────────────────────────────────────────────────┐  │
 * │  │ ⭕ 16  Spaghetti Carbonara                             │  │
 * │  │ 🔴    [PLANLAGT]                                       │  │
 * │  │       🔴 Menu (8t) 🟡 Indkøb (36t) ✅ Best. (96t)     │  │
 * │  ├────────────────────────────────────────────────────────┤  │
 * │  │ ⭕ 18  Lasagne Bolognese                               │  │
 * │  │ 🟡    [PLANLAGT]                                       │  │
 * │  │       🟡 Menu (24t) ✅ Indkøb (72t) ✅ Bestilling      │  │
 * │  ├────────────────────────────────────────────────────────┤  │
 * │  │ ⭕ 25  Kylling Curry                                   │  │
 * │  │       [PLANLAGT]                                       │  │
 * │  │       ✅ Menu (96t) ✅ Indkøb (120t) ✅ Bestilling     │  │
 * │  └────────────────────────────────────────────────────────┘  │
 * └──────────────────────────────────────────────────────────────┘
 *
 * Color System (Ocean - Professional Chef):
 * - Ocean blue circles: Next (bold), Future (light), Past (mocha)
 * - Deadline rings: 🔴 Red (critical <24h), 🟡 Yellow (warning 24-72h)
 * - Visual continuity: Same colored circles + rings in both views
 *
 * Features:
 * - Countdown timer (train station style) to next cooking
 * - Temporal states (next/future/past) with ocean color palette
 * - Deadline rings (red critical, yellow warning, green ok)
 * - Deadline badges in agenda (specific deadline types with time)
 * - Calendar + Agenda views with identical visual language
 * - NO holidays (chef cares about cooking schedule, not vacation)
 *
 * Uses:
 * - BaseCalendar for calendar structure
 * - useTemporalCalendar for shared temporal/countdown logic
 * - CHEF_CALENDAR design system for consistent ocean palette
 * - DEADLINE_BADGES for urgency indicators
 */
import type {DateRange} from '~/types/dateTypes'
import type {DateValue} from '@internationalized/date'
import type {DinnerEventDisplay} from '~/composables/useBookingValidation'
import type {DayEventList} from '~/composables/useCalendarEvents'
import type {CookingTeamDisplay} from '~/composables/useCookingTeamValidation'
import {toDate} from '~/utils/date'
import {isWithinInterval} from 'date-fns'

interface Props {
  seasonDates: DateRange
  team: CookingTeamDisplay
  dinnerEvents: DinnerEventDisplay[]
  selectedDinnerId?: number | null
  showSelection?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selectedDinnerId: null,
  showSelection: false
})

const emit = defineEmits<{
  select: [dinnerId: number]
}>()

const {useTemporalSplit, createTemporalEventLists} = useTemporalCalendar()
const {getDinnerTimeRange, getDeadlineUrgency} = useSeason()
const {CALENDAR, CHEF_CALENDAR, TYPOGRAPHY, SIZES} = useTheSlopeDesignSystem()

// Focus date for calendar navigation (from selected dinner)
const selectedDinner = computed(() => props.dinnerEvents.find(e => e.id === props.selectedDinnerId))
const focusDate = computed(() => selectedDinner.value ? new Date(selectedDinner.value.date) : null)

// View state with horizontal tabs (default: calendar view)
const viewTabs = [
  { label: 'Agenda', value: 'agenda', icon: 'i-heroicons-list-bullet' },
  { label: 'Kalender', value: 'calendar', icon: 'i-heroicons-calendar' }
]
const viewMode = ref<'agenda' | 'calendar'>('calendar')

// Temporal splitting using shared composable
const {
  nextDinner,
  pastDinnerDates,
  futureDinnerDates,
  nextDinnerDateRange,
  dinnerStartHour
} = useTemporalSplit(props.dinnerEvents)

// Countdown timer (component-local with lifecycle hooks)
const currentTime = ref(new Date())
const updateInterval = ref<NodeJS.Timeout | null>(null)

onMounted(() => {
  updateInterval.value = setInterval(() => {
    currentTime.value = new Date()
  }, 1000)
})

onUnmounted(() => {
  if (updateInterval.value) {
    clearInterval(updateInterval.value)
  }
})

const isDuringEvent = computed(() => {
  if (!nextDinner.value) return false
  const eventTimeRange = getDinnerTimeRange(new Date(nextDinner.value.date), dinnerStartHour, 60)
  return isWithinInterval(currentTime.value, eventTimeRange)
})

const countdown = computed(() => {
  if (!nextDinner.value || !nextDinnerDateRange.value) return null
  return calculateCountdown(nextDinnerDateRange.value.start, currentTime.value)
})

// Create event lists with ocean color (professional chef palette)
const allEventLists = computed(() =>
  createTemporalEventLists(
    pastDinnerDates.value,
    futureDinnerDates.value,
    nextDinner.value,
    'ocean'
  )
)

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
  return type === 'past' ? CALENDAR.day.past : CHEF_CALENDAR.day[type]
}

// Selection support
const handleDateClick = (day: DateValue) => {
  if (!props.showSelection) return
  const dinner = getDinnerForDay(day)
  if (dinner) emit('select', dinner.id)
}

const getDinnerForDay = (day: DateValue): DinnerEventDisplay | undefined => {
  const dayDate = toDate(day)
  return props.dinnerEvents.find(event =>
    dayDate.toDateString() === new Date(event.date).toDateString()
  )
}

const isSelected = (day: DateValue): boolean => {
  if (!props.selectedDinnerId || !props.showSelection) return false
  const dinner = getDinnerForDay(day)
  return dinner?.id === props.selectedDinnerId
}

// Agenda view - sorted dinner events
const sortedDinnerEvents = computed(() => {
  return [...props.dinnerEvents].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )
})

// Deadline urgency ring logic (shared across calendars)
const URGENCY_TO_RING_CLASS = {
  0: CALENDAR.deadline.onTrack,
  1: CALENDAR.deadline.warning,
  2: CALENDAR.deadline.critical
} as const

const getDeadlineRingClass = (day: DateValue): string => {
  const dinner = getDinnerForDay(day)
  if (!dinner) return ''

  const urgency = getDeadlineUrgency(new Date(dinner.date))
  return URGENCY_TO_RING_CLASS[urgency]
}

// Legend items using design system classes
const legendItems = computed(() => [
  {
    label: 'Næste madlavning',
    circleClass: `${SIZES.calendarCircle.value} ${CALENDAR.day.shape} ${CHEF_CALENDAR.day.next}`
  },
  {
    label: 'Valgt dato',
    circleClass: `${SIZES.calendarCircle.value} ${CALENDAR.day.shape} ${CHEF_CALENDAR.day.next} ${CHEF_CALENDAR.selection}`
  },
  {
    label: 'Planlagt madlavning',
    circleClass: `${SIZES.calendarCircle.value} ${CALENDAR.day.shape} ${CHEF_CALENDAR.day.future}`
  },
  {
    label: 'Tidligere madlavning',
    circleClass: `${SIZES.calendarCircle.value} ${CALENDAR.day.shape} ${CALENDAR.day.past}`
  },
  {
    label: 'Deadline kritisk (<24t)',
    circleClass: `${SIZES.calendarCircle.value} ${CALENDAR.day.shape} ${CHEF_CALENDAR.day.next} ${CALENDAR.deadline.critical}`
  },
  {
    label: 'Deadline snart (24-72t)',
    circleClass: `${SIZES.calendarCircle.value} ${CALENDAR.day.shape} ${CHEF_CALENDAR.day.next} ${CALENDAR.deadline.warning}`
  }
])

const accordionItems = [{ label: 'Kalender', slot: 'calendar-content' }]
const accordionDefault = computed(() => SIZES.calendarMonths.value > 1 ? '0' : undefined)
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Countdown Timer (Train Station Style) -->
    <div :class="[CALENDAR.countdown.container, CHEF_CALENDAR.countdown.border]">
      <!-- Active cooking event state -->
      <div v-if="nextDinner && countdown" class="text-center space-y-2">
        <!-- Title -->
        <div :class="CALENDAR.countdown.title">
          Næste Madlavning
        </div>

        <!-- Weekday + Date (Danish 3-letter) -->
        <div :class="[CALENDAR.countdown.date, CHEF_CALENDAR.countdown.accent]">
          {{ formatDanishWeekdayDate(new Date(nextDinner.date)) }}
        </div>

        <!-- Countdown (Large - Most Important) -->
        <div :class="[CALENDAR.countdown.number, CHEF_CALENDAR.countdown.accent]">
          <span :class="CALENDAR.countdown.numberPrefix">OM</span>
          <span class="ml-2">{{ countdown.formatted }}</span>
        </div>

        <!-- Cooking Time (Smaller) with blinking dot during event -->
        <div class="flex items-baseline justify-center gap-2">
          <span :class="[CALENDAR.countdown.timeLabel, CHEF_CALENDAR.countdown.accentLight]">madlavning kl </span>
          <span :class="[CALENDAR.countdown.timeValue, CHEF_CALENDAR.countdown.accentMedium]">
            {{ dinnerStartHour.toString().padStart(2, '0') }}:00
          </span>
          <span class="text-xs md:text-sm invisible" aria-hidden="true">madlavning kl </span>
          <span
            v-if="isDuringEvent"
            :class="[CALENDAR.countdown.dot, CHEF_CALENDAR.countdown.dot]"
            aria-label="Cooking is happening now"
          />
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="text-center">
        <div class="text-lg font-semibold tracking-widest uppercase">
          Ingen Madlavning
        </div>
      </div>
    </div>

    <!-- View Toggle -->
    <div class="px-4 pt-4">
      <UTabs
        v-model="viewMode"
        :items="viewTabs"
        orientation="horizontal"
        variant="link"
      />
    </div>

    <!-- Agenda View -->
    <div v-if="viewMode === 'agenda'" class="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
      <ChefDinnerCard
        v-for="dinner in sortedDinnerEvents"
        :key="dinner.id"
        :dinner-event="dinner"
        :selected="dinner.id === selectedDinnerId"
        @select="emit('select', $event)"
      />
    </div>

    <!-- Calendar Accordion (collapsed on mobile, open on desktop) -->
    <UAccordion v-else :items="accordionItems" :default-value="accordionDefault" class="flex-1">
      <template #calendar-content>
        <div class="flex-1">
          <BaseCalendar :season-dates="seasonDates" :event-lists="allEventLists" :number-of-months="1" :focus-date="focusDate">
            <template #day="{ day, eventLists }">
              <div
                v-if="getDayType(eventLists)"
                :data-testid="`calendar-dinner-date-${day.day}`"
                :class="[
                  SIZES.calendarCircle.value,
                  CALENDAR.day.shape,
                  getDayColorClass(getDayType(eventLists)!),
                  getDayType(eventLists) !== 'past' ? getDeadlineRingClass(day) : '',
                  isSelected(day) ? CHEF_CALENDAR.selection : ''
                ]"
                @click="handleDateClick(day)"
              >
                {{ day.day }}
              </div>
              <span v-else class="text-sm">{{ day.day }}</span>
            </template>

            <!-- Legend -->
            <template #legend>
              <div class="px-4 py-6 md:px-6 md:py-8 space-y-3 border-t mt-auto" :class="TYPOGRAPHY.bodyTextSmall">
                <div v-for="legendItem in legendItems" :key="legendItem.label" class="flex items-center gap-4">
                  <div :class="legendItem.circleClass">
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
