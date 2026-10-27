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
 */

import {formatDanishWeekdayDate, calculateCountdown} from '~/utils/date'
import {isWithinInterval} from 'date-fns'

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
    /** Next event with date property */
    nextEvent: { id: number; date: Date } | null
    /** Event start hour (0-23) */
    eventStartHour: number
    /** Event duration in minutes for "during event" detection */
    eventDurationMinutes?: number
    /** Color palette: 'dinner' (peach) or 'chef' (ocean) */
    palette?: 'dinner' | 'chef'
    /** Whether component is clickable (emits select event) */
    clickable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    eventDurationMinutes: 60,
    palette: 'dinner',
    clickable: false
})

const emit = defineEmits<{
    select: [id: number]
}>()

// Get palette-specific styles
const paletteStyles = computed(() =>
    props.palette === 'chef' ? CHEF_CALENDAR.countdown : DINNER_CALENDAR.countdown
)

// The page's clock: the server and the browser render the same minute, and it ticks after hydration
const now = useClock()

// Import from useSeason for consistent time range calculation
const {getDinnerTimeRange} = useSeason()

// Calculate if we're during the event
const isDuringEvent = computed(() => {
    if (!props.nextEvent) return false
    const eventTimeRange = getDinnerTimeRange(
        new Date(props.nextEvent.date),
        props.eventStartHour,
        props.eventDurationMinutes
    )
    return isWithinInterval(now.value, eventTimeRange)
})

// The event's start, the countdown's target
const eventStart = computed(() =>
    props.nextEvent ? getDinnerTimeRange(new Date(props.nextEvent.date), props.eventStartHour, 0).start : undefined
)

// Calculate countdown
const countdown = computed(() => eventStart.value ? calculateCountdown(eventStart.value, now.value) : null)

// Computed display state
const displayState = computed((): 'during' | 'future' | 'empty' => {
    if (isDuringEvent.value) return 'during'
    if (countdown.value && countdown.value.hours > 0) return 'future'
    if (countdown.value && countdown.value.formatted && countdown.value.formatted !== 'Overskredet') return 'future'
    return 'empty'
})

// Handle click
const handleClick = () => {
    if (props.clickable && props.nextEvent) {
        emit('select', props.nextEvent.id)
    }
}
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
      <template v-if="nextEvent && displayState !== 'empty'">
        <!-- Weekday + Date (Danish 3-letter) -->
        <div :class="[CALENDAR.countdown.date, paletteStyles.accent]">
          {{ formatDanishWeekdayDate(new Date(nextEvent.date)) }}
        </div>

        <!-- Countdown (Large - Most Important) -->
        <div :class="[CALENDAR.countdown.number, paletteStyles.accent]">
          <!-- During event: show NU -->
          <template v-if="displayState === 'during'">
            NU
          </template>
          <!-- Future: show OM X -->
          <template v-else-if="displayState === 'future' && countdown">
            <span :class="CALENDAR.countdown.numberPrefix">OM</span>
            <span :class="CALENDAR.countdown.numberValue">{{ countdown.formatted }}</span>
          </template>
        </div>

        <!-- Event Time (Smaller) with blinking dot during event -->
        <div :class="CALENDAR.countdown.timeRow">
          <span :class="[CALENDAR.countdown.timeLabel, paletteStyles.accentLight]">{{ timeLabel }} kl </span>
          <span :class="[CALENDAR.countdown.timeValue, paletteStyles.accentMedium]">
            {{ eventStartHour.toString().padStart(2, '0') }}:00
          </span>
          <!-- Invisible spacer for centering -->
          <span :class="CALENDAR.countdown.timeSpacer" aria-hidden="true">{{ timeLabel }} kl </span>
          <!-- Blinking dot during event -->
          <span
            v-if="isDuringEvent"
            :class="[CALENDAR.countdown.dot, paletteStyles.dot]"
            :aria-label="`${title} is happening now`"
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
