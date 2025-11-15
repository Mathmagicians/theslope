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
import type {DinnerEventDisplay} from '~/composables/useDinnerEventValidation'
import type {DayEventList} from '~/composables/useCalendarEvents'
import {isCalendarDateInDateList, formatDanishWeekdayDate, calculateCountdown, toDate} from '~/utils/date'
import {isWithinInterval} from 'date-fns'

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
  getDinnerTimeRange,
  getNextDinnerDate,
  splitDinnerEvents
} = useSeason()
const {BG, TEXT, BORDER, TYPOGRAPHY} = useColorSystem()

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

const hasPastDinnerEvent = (eventLists: DayEventList[]) => {
  return eventLists.some(list => list.listId === 'past-dinners')
}

const hasFutureDinnerEvent = (eventLists: DayEventList[]) => {
  return eventLists.some(list => list.listId === 'future-dinners')
}

const hasNextDinnerEvent = (eventLists: DayEventList[]) => {
  return eventLists.some(list => list.listId === 'next-dinner')
}

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

const isDuringDinner = computed(() => {
  if (!nextDinner.value) return false
  const dinnerTimeRange = getDinnerTimeRange(new Date(nextDinner.value.date), dinnerStartHour, 60)
  return isWithinInterval(currentTime.value, dinnerTimeRange)
})

const countdown = computed(() => {
  if (!nextDinner.value || !nextDinnerDateRange.value) return null
  return calculateCountdown(nextDinnerDateRange.value.start, currentTime.value)
})

const legendItems = computed(() => [
  {
    label: 'Næste fællesspisning',
    type: 'circle' as const,
    circleClass: `w-8 h-8 rounded-full flex items-center justify-center text-sm text-white font-bold ${BG.peach[400]}`
  },
  {
    label: 'Valgt dato',
    type: 'circle' as const,
    circleClass: `w-8 h-8 rounded-full flex items-center justify-center text-sm text-white font-bold ${BG.peach[400]} ring-2 ring-peach-700`
  },
  {
    label: 'Planlagt fællesspisning',
    type: 'circle' as const,
    circleClass: props.useRings
      ? `w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${BORDER.peach[400]} ${TEXT.peach[600]}`
      : `w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${BG.peach[200]} ${TEXT.peach[800]}`
  },
  {
    label: 'Tidligere fællesspisning',
    type: 'circle' as const,
    circleClass: `w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${BG.mocha[100]} ${TEXT.mocha[900]}`
  },
  {
    label: 'Ferie',
    type: 'chip' as const
  }
])

const isMd = inject<Ref<boolean>>('isMd')
const getIsMd = computed((): boolean => isMd?.value ?? false)

const accordionItems = [{
  label: 'Kalender',
  slot: 'calendar-content'
}]

const defaultValue = computed(() => getIsMd.value ? '0' : undefined)

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
    <!-- Countdown Timer (Train Station Style) - Always visible when enabled -->
    <div v-if="showCountdown" class="bg-amber-950 text-amber-50 py-6 md:py-8 border-b-2" :class="BORDER.peach[400]">
      <!-- Active dinner state -->
      <div v-if="nextDinner && countdown" class="text-center space-y-2">
        <!-- Title -->
        <div class="text-xs md:text-sm font-semibold tracking-widest uppercase opacity-90">
          Næste Fællesspisning
        </div>

        <!-- Weekday + Date (Danish 3-letter) -->
        <div class="text-sm font-medium uppercase" :class="TEXT.peach[400]">
          {{ formatDanishWeekdayDate(new Date(nextDinner.date)) }}
        </div>

        <!-- Countdown (Large - Most Important) -->
        <div class="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight" :class="TEXT.peach[400]">
          <span class="opacity-75 text-amber-50">OM</span>
          <span class="ml-2">{{ countdown.formatted }}</span>
        </div>

        <!-- Dinner Time (Smaller) with blinking dot during dinner -->
        <div class="flex items-baseline justify-center gap-2">
          <span class="text-xs md:text-sm" :class="TEXT.peach[50]">spisning kl </span>
          <span class="text-xl md:text-2xl font-medium"
                :class="TEXT.peach[300]">{{ dinnerStartHour.toString().padStart(2, '0') }}:00</span>
          <span class="text-xs md:text-sm invisible" aria-hidden="true">spisning kl </span>
          <span v-if="isDuringDinner"
                class="w-3 h-3 rounded-full animate-pulse self-center"
                :class="BG.peach[400]"
                aria-label="Dinner is happening now"></span>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="text-center">
        <div class="text-lg font-semibold tracking-widest uppercase">
          Ingen Fællespsisning
        </div>
      </div>
    </div>

    <!-- Calendar Accordion (collapsed on mobile, open on desktop) -->
    <UAccordion :items="accordionItems" :default-value="defaultValue" class="flex-1">
      <template #calendar-content>
        <!-- Calendar Display -->
        <div class="flex-1">
          <BaseCalendar :season-dates="seasonDates" :event-lists="allEventLists" :number-of-months="numberOfMonths">
            <template #day="{ day, eventLists }">
              <!-- Holiday takes precedence -->
              <UChip v-if="isHoliday(day)" show size="md" color="success">
                {{ day.day }}
              </UChip>

              <!-- Next dinner event (prominent - full color) -->
              <div v-else-if="hasNextDinnerEvent(eventLists)"
                   class="w-8 h-8 rounded-full flex items-center justify-center text-sm text-white font-bold cursor-pointer hover:opacity-90"
                   :class="[BG.peach[400], isSelected(day) ? 'ring-2 md:ring-4 ring-peach-700' : '']"
                   @click="handleDateClick(day)">
                {{ day.day }}
              </div>

              <!-- Future dinner event (rings - subtle) -->
              <div v-else-if="hasFutureDinnerEvent(eventLists) && useRings"
                   class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 cursor-pointer hover:opacity-90"
                   :class="[`${BORDER.peach[400]} ${TEXT.peach[600]}`, isSelected(day) ? 'ring-2 md:ring-4 ring-peach-700' : '']"
                   @click="handleDateClick(day)">
                {{ day.day }}
              </div>

              <!-- Future dinner event (lighter fill - subtle) -->
              <div v-else-if="hasFutureDinnerEvent(eventLists)"
                   class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium cursor-pointer hover:opacity-90"
                   :class="[`${BG.peach[200]} ${TEXT.peach[800]}`, isSelected(day) ? 'ring-2 md:ring-4 ring-peach-700' : '']"
                   @click="handleDateClick(day)">
                {{ day.day }}
              </div>

              <!-- Past dinner event (mocha - discrete) -->
              <div v-else-if="hasPastDinnerEvent(eventLists)"
                   class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium cursor-pointer hover:opacity-90"
                   :class="[`${BG.mocha[100]} ${TEXT.mocha[900]}`, isSelected(day) ? 'ring-2 md:ring-4 ring-peach-700' : '']"
                   @click="handleDateClick(day)">
                {{ day.day }}
              </div>

              <!-- Regular day -->
              <span v-else class="text-sm">{{ day.day }}</span>
            </template>
          </BaseCalendar>
        </div>

        <!-- Legend -->
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
    </UAccordion>
  </div>
</template>
