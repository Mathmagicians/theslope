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
  team: CookingTeam
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
const {CHEF_CALENDAR, TYPOGRAPHY} = useTheSlopeDesignSystem()

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

// Event list helpers
const hasPastDinnerEvent = (eventLists: DayEventList[]) => {
  return eventLists.some(list => list.listId === 'past-dinners')
}

const hasFutureDinnerEvent = (eventLists: DayEventList[]) => {
  return eventLists.some(list => list.listId === 'future-dinners')
}

const hasNextDinnerEvent = (eventLists: DayEventList[]) => {
  return eventLists.some(list => list.listId === 'next-dinner')
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

// Deadline urgency ring logic
const URGENCY_TO_RING_CLASS = {
  0: '', // On track - no ring
  1: CHEF_CALENDAR.deadline.warning, // Warning - yellow ring
  2: CHEF_CALENDAR.deadline.critical // Critical - red ring
} as const

const getDeadlineRingClass = (day: DateValue): string => {
  const dinner = getDinnerForDay(day)
  if (!dinner) return ''

  const urgency = getDeadlineUrgency(new Date(dinner.date))
  return URGENCY_TO_RING_CLASS[urgency]
}

// Legend items with responsive sizing
const legendItems = computed(() => {
  const baseSize = getIsMd.value ? 'w-8 h-8' : 'w-6 h-6'
  const textSize = getIsMd.value ? 'text-sm' : 'text-xs'

  return [
    {
      label: 'Næste madlavning',
      type: 'circle' as const,
      circleClass: `${baseSize} rounded-full flex items-center justify-center ${textSize} text-white font-bold ${CHEF_CALENDAR.base.next}`
    },
    {
      label: 'Valgt dato',
      type: 'circle' as const,
      circleClass: `${baseSize} rounded-full flex items-center justify-center ${textSize} text-white font-bold ${CHEF_CALENDAR.base.next} ${CHEF_CALENDAR.selection.ring}`
    },
    {
      label: 'Planlagt madlavning',
      type: 'circle' as const,
      circleClass: `${baseSize} rounded-full flex items-center justify-center ${textSize} font-medium ${CHEF_CALENDAR.base.future} ${CHEF_CALENDAR.text.future}`
    },
    {
      label: 'Tidligere madlavning',
      type: 'circle' as const,
      circleClass: `${baseSize} rounded-full flex items-center justify-center ${textSize} font-medium ${CHEF_CALENDAR.base.past} ${CHEF_CALENDAR.text.past}`
    }
  ]
})

const isMd = inject<Ref<boolean>>('isMd')
const getIsMd = computed((): boolean => isMd?.value ?? false)

const accordionItems = [{
  label: 'Kalender',
  slot: 'calendar-content'
}]

const defaultValue = computed(() => getIsMd.value ? '0' : undefined)
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Countdown Timer (Train Station Style) -->
    <div :class="CHEF_CALENDAR.countdown.container">
      <!-- Active cooking event state -->
      <div v-if="nextDinner && countdown" class="text-center space-y-2">
        <!-- Title -->
        <div :class="CHEF_CALENDAR.countdown.title">
          Næste Madlavning
        </div>

        <!-- Weekday + Date (Danish 3-letter) -->
        <div :class="CHEF_CALENDAR.countdown.date">
          {{ formatDanishWeekdayDate(new Date(nextDinner.date)) }}
        </div>

        <!-- Countdown (Large - Most Important) -->
        <div :class="CHEF_CALENDAR.countdown.number">
          <span :class="CHEF_CALENDAR.countdown.numberPrefix">OM</span>
          <span class="ml-2">{{ countdown.formatted }}</span>
        </div>

        <!-- Cooking Time (Smaller) with blinking dot during event -->
        <div class="flex items-baseline justify-center gap-2">
          <span :class="CHEF_CALENDAR.countdown.timeLabel">madlavning kl </span>
          <span :class="CHEF_CALENDAR.countdown.timeValue">
            {{ dinnerStartHour.toString().padStart(2, '0') }}:00
          </span>
          <span class="text-xs md:text-sm invisible" aria-hidden="true">madlavning kl </span>
          <span
            v-if="isDuringEvent"
            :class="CHEF_CALENDAR.countdown.dot"
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
      <ChefMenuCard
        v-for="dinner in sortedDinnerEvents"
        :key="dinner.id"
        :dinner-event="dinner"
        mode="compact"
        :selected="dinner.id === selectedDinnerId"
        @select="emit('select', $event)"
      />
    </div>

    <!-- Calendar Accordion (collapsed on mobile, open on desktop) -->
    <UAccordion v-else :items="accordionItems" :default-value="defaultValue" class="flex-1">
      <template #calendar-content>
        <div class="flex-1">
          <BaseCalendar :season-dates="seasonDates" :event-lists="allEventLists" :number-of-months="1">
            <template #day="{ day, eventLists }">
              <!-- Next cooking event (prominent - full color) -->
              <div
                v-if="hasNextDinnerEvent(eventLists)"
                :data-testid="`calendar-dinner-date-${day.day}`"
                class="w-8 h-8 rounded-full flex items-center justify-center text-sm text-white font-bold cursor-pointer hover:opacity-90"
                :class="[CHEF_CALENDAR.base.next, getDeadlineRingClass(day), isSelected(day) ? CHEF_CALENDAR.selection.ring : '']"
                @click="handleDateClick(day)"
              >
                {{ day.day }}
              </div>

              <!-- Future cooking event (lighter fill - subtle) -->
              <div
                v-else-if="hasFutureDinnerEvent(eventLists)"
                :data-testid="`calendar-dinner-date-${day.day}`"
                class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium cursor-pointer hover:opacity-90"
                :class="[CHEF_CALENDAR.base.future, CHEF_CALENDAR.text.future, getDeadlineRingClass(day), isSelected(day) ? CHEF_CALENDAR.selection.ring : '']"
                @click="handleDateClick(day)"
              >
                {{ day.day }}
              </div>

              <!-- Past cooking event (mocha - discrete) -->
              <div
                v-else-if="hasPastDinnerEvent(eventLists)"
                :data-testid="`calendar-dinner-date-${day.day}`"
                class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium cursor-pointer hover:opacity-90"
                :class="[CHEF_CALENDAR.base.past, CHEF_CALENDAR.text.past, isSelected(day) ? CHEF_CALENDAR.selection.ring : '']"
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
