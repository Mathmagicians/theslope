<script setup lang="ts">
/**
 * CountdownTimer - Train station style countdown display
 *
 * Shared component for dinner and chef calendar displays.
 * Title is always shown for context. Three content states:
 * - Future: date + "OM 2 DAGE" + time
 * - During: date + "NU" + time with blinking dot
 * - Empty/Past: emptyText only
 *
 * ┌─────────────────────────────────────────┐
 * │         Næste Fællesspisning            │  ← Title (always)
 * │            TIR. 06/01                   │
 * │            OM 2 DAGE                    │
 * │          spisning kl 18:00              │
 * └─────────────────────────────────────────┘
 *
 * Visual check: /dinner and /chef, the countdown before, during and after a dinner, phone and desktop.
 */

import {isWithinInterval} from 'date-fns'
import {DATE_WORDS} from '~/config/dateWords'
import type {DinnerEventDate} from '~/composables/useBookingValidation'

const {
    CALENDAR,
    CHEF_CALENDAR,
    DINNER_CALENDAR
} = useTheSlopeDesignSystem()

interface Props {
    /** Title shown above the date */
    title: string
    /** Label before time, e.g., "spisning" or "madlavning" */
    timeLabel: string
    /** Text shown when no event */
    emptyText: string
    /** The next event, null without one */
    nextEvent: DinnerEventDate | null
    /** Event start hour (0-23) */
    eventStartHour: number
    /** Event duration in minutes for "during event" detection */
    eventDurationMinutes?: number
    /** The calendar's palette */
    palette?: CountdownPalette
    /** Whether component is clickable (emits select event) */
    clickable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    eventDurationMinutes: 60,
    palette: COUNTDOWN_PALETTE.dinner,
    clickable: false
})

const emit = defineEmits<{
    select: [id: number]
}>()

const PALETTE_STYLES = {
    [COUNTDOWN_PALETTE.dinner]: DINNER_CALENDAR.countdown,
    [COUNTDOWN_PALETTE.chef]: CHEF_CALENDAR.countdown
}
const paletteStyles = computed(() => PALETTE_STYLES[props.palette])

const COUNTDOWN_STATE = {during: 'during', future: 'future', empty: 'empty'} as const
type CountdownState = typeof COUNTDOWN_STATE[keyof typeof COUNTDOWN_STATE]

// The page's clock: the server and the browser render the same minute, and it ticks after hydration
const now = useClock()

// Import from useSeason for consistent time range calculation
const {getDinnerTimeRange} = useSeason()

// Calculate if we're during the event
const isDuringEvent = computed(() => {
    if (!props.nextEvent) return false
    const eventTimeRange = getDinnerTimeRange(
        props.nextEvent.date,
        props.eventStartHour,
        props.eventDurationMinutes
    )
    return isWithinInterval(now.value, eventTimeRange)
})

// The event's start, the countdown's target
const eventStart = computed(() =>
    props.nextEvent ? getDinnerTimeRange(props.nextEvent.date, props.eventStartHour, 0).start : undefined
)

// Calculate countdown
const countdown = computed(() => eventStart.value ? calculateCountdown(eventStart.value, now.value) : null)

// Computed display state
const displayState = computed((): CountdownState => {
    if (isDuringEvent.value) return COUNTDOWN_STATE.during
    if (countdown.value && countdown.value.hours > 0) return COUNTDOWN_STATE.future
    if (countdown.value && countdown.value.formatted && countdown.value.formatted !== DATE_WORDS.overdue) return COUNTDOWN_STATE.future
    return COUNTDOWN_STATE.empty
})

// Handle click
const handleClick = () => {
    if (props.clickable && props.nextEvent) {
        emit('select', props.nextEvent.id)
    }
}
</script>

<script lang="ts">
/** The calendar a countdown heads, and so its palette: the dinner calendar's peach, the chef calendar's ocean */
export const COUNTDOWN_PALETTE = {dinner: 'dinner', chef: 'chef'} as const
export type CountdownPalette = typeof COUNTDOWN_PALETTE[keyof typeof COUNTDOWN_PALETTE]
</script>

<template>
  <div
    :class="[
      CALENDAR.countdown.container,
      paletteStyles.border,
      clickable && nextEvent ? CALENDAR.countdown.clickable : ''
    ]"
    @click="handleClick"
  >
    <div :class="CALENDAR.countdown.content">
      <!-- Title - always shown -->
      <div :class="CALENDAR.countdown.title">
        {{ title }}
      </div>

      <!-- Active event state -->
      <template v-if="nextEvent && displayState !== COUNTDOWN_STATE.empty">
        <!-- Weekday + Date (Danish 3-letter) -->
        <div :class="[CALENDAR.countdown.date, paletteStyles.accent]">
          {{ formatDanishWeekdayDate(nextEvent.date) }}
        </div>

        <!-- Countdown (Large - Most Important) -->
        <div :class="[CALENDAR.countdown.number, paletteStyles.accent]">
          <!-- During event: show NU -->
          <template v-if="displayState === COUNTDOWN_STATE.during">
            {{ DATE_WORDS.countdown.now }}
          </template>
          <!-- Future: show OM X -->
          <template v-else-if="displayState === COUNTDOWN_STATE.future && countdown">
            <span :class="CALENDAR.countdown.numberPrefix">{{ DATE_WORDS.countdown.in }}</span>
            <span :class="CALENDAR.countdown.numberValue">{{ countdown.formatted }}</span>
          </template>
        </div>

        <!-- Event Time (Smaller) with blinking dot during event -->
        <div :class="CALENDAR.countdown.timeRow">
          <span :class="[CALENDAR.countdown.timeLabel, paletteStyles.accentLight]">{{ timeLabel }} {{ DATE_WORDS.countdown.at }} </span>
          <span :class="[CALENDAR.countdown.timeValue, paletteStyles.accentMedium]">
            {{ eventStartHour.toString().padStart(2, '0') }}:00
          </span>
          <!-- Invisible spacer for centering -->
          <span :class="CALENDAR.countdown.timeSpacer" aria-hidden="true">{{ timeLabel }} {{ DATE_WORDS.countdown.at }} </span>
          <!-- Blinking dot during event -->
          <span
            v-if="isDuringEvent"
            :class="[CALENDAR.countdown.dot, paletteStyles.dot]"
            :aria-label="DATE_WORDS.countdown.happeningNow(title)"
          />
        </div>
      </template>

      <!-- Empty/past state - title already shown above -->
      <div v-else :class="[CALENDAR.countdown.number, paletteStyles.accent]">
        {{ emptyText }}
      </div>
    </div>
  </div>
</template>
