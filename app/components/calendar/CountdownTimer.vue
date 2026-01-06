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

import {formatDanishWeekdayDate} from '~/utils/date'
import {calculateCountdown} from '~/utils/date'
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

// Real-time clock for countdown updates
const currentTime = ref(new Date())
let intervalId: ReturnType<typeof setInterval> | null = null

onMounted(() => {
    intervalId = setInterval(() => {
        currentTime.value = new Date()
    }, 1000)
})

onUnmounted(() => {
    if (intervalId) clearInterval(intervalId)
})

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
    return isWithinInterval(currentTime.value, eventTimeRange)
})

// Calculate countdown
const countdown = computed(() => {
    if (!props.nextEvent) return null
    const eventTimeRange = getDinnerTimeRange(
        new Date(props.nextEvent.date),
        props.eventStartHour,
        0
    )
    return calculateCountdown(eventTimeRange.start, currentTime.value)
})

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
      clickable && nextEvent ? 'cursor-pointer hover:ring-2 hover:ring-opacity-50 transition-all' : ''
    ]"
    @click="handleClick"
  >
    <div class="text-center space-y-2">
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
            <span class="ml-2">{{ countdown.formatted }}</span>
          </template>
        </div>

        <!-- Event Time (Smaller) with blinking dot during event -->
        <div class="flex items-baseline justify-center gap-2">
          <span :class="[CALENDAR.countdown.timeLabel, paletteStyles.accentLight]">{{ timeLabel }} kl </span>
          <span :class="[CALENDAR.countdown.timeValue, paletteStyles.accentMedium]">
            {{ eventStartHour.toString().padStart(2, '0') }}:00
          </span>
          <!-- Invisible spacer for centering -->
          <span class="text-xs md:text-sm invisible" aria-hidden="true">{{ timeLabel }} kl </span>
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
