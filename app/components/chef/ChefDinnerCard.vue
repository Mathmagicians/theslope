<script setup lang="ts">
/**
 * ChefDinnerCard - Dinner event card for chef master view
 *
 * Features:
 * - Display dinner date, menu, state
 * - Click to select dinner
 * - Multiple deadline warnings with badge labels
 * - State badges (SCHEDULED, ANNOUNCED, CANCELLED, CONSUMED)
 * - Visual selection state
 *
 * Deadline types (SCHEDULED only):
 * 1. Menu announcement (chef action) - badge "Menu"
 *    - Warning: < 72h before booking deadline
 *    - Critical: Past booking deadline
 * 2. Grocery shopping (chef action) - badge "Indkøb"
 *    - Warning: < 72h before dinner
 *    - Urgent: < 24h before dinner
 * 3. Booking status (informational) - badge "Bestil"
 *    - Shows booking window open/closed
 *    - Uses canModifyOrders() from useSeason
 *
 * Used in:
 * - /chef/index.vue master view (dinner list)
 *
 * ADR Compliance:
 * - ADR-001: Types from validation composables
 * - Mobile-first responsive design
 * - Uses useSeason for time-related logic (no manual date calculations)
 * - Reuses existing utilities: getDinnerTimeRange, calculateCountdown, canModifyOrders
 * - Consistent thresholds: 72h (warning), 24h (urgent)
 */
import type { DinnerEventDisplay } from '~/composables/useBookingValidation'
import { format } from 'date-fns'
import { da } from 'date-fns/locale'
import { calculateCountdown } from '~/utils/date'

interface Props {
  dinnerEvent: DinnerEventDisplay
  selected?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selected: false
})

const emit = defineEmits<{
  select: [dinnerEventId: number]
}>()

// Design system
const { COLOR, SIZES, DINNER_STATE_BADGES } = useTheSlopeDesignSystem()

// Validation schemas
const { DinnerStateSchema } = useBookingValidation()
const DinnerState = DinnerStateSchema.enum

// Time logic from useSeason (same pattern as DinnerCalendarDisplay)
const { isAnnounceMenuPastDeadline, canModifyOrders, getDefaultDinnerStartTime, getDinnerTimeRange } = useSeason()
const dinnerStartHour = getDefaultDinnerStartTime()

// Deadline thresholds (consistent across all deadlines)
const DEADLINE_THRESHOLDS = {
  WARNING: 72, // hours - show warning
  URGENT: 24   // hours - urgent action needed
} as const

// Format dinner date
const formattedDate = computed(() => {
  return format(props.dinnerEvent.date, 'EEEE d. MMMM', { locale: da })
})

const formattedShortDate = computed(() => {
  return format(props.dinnerEvent.date, 'dd/MM', { locale: da })
})

// Chef action warnings (only for SCHEDULED state)
const deadlineWarnings = computed(() => {
  if (props.dinnerEvent.state !== DinnerState.SCHEDULED) return []

  const warnings: Array<{
    badge: string
    message: string
    color: string
    level: 'warning' | 'urgent' | 'critical'
  }> = []

  const dinnerTimeRange = getDinnerTimeRange(props.dinnerEvent.date, dinnerStartHour, 0)
  const countdown = calculateCountdown(dinnerTimeRange.start)

  // Menu announcement deadline (before booking deadline)
  const isPastMenuDeadline = isAnnounceMenuPastDeadline(props.dinnerEvent.date)
  if (isPastMenuDeadline) {
    warnings.push({
      badge: 'Menu',
      message: 'Deadline overskredet',
      color: COLOR.error,
      level: 'critical'
    })
  } else if (countdown.hours < DEADLINE_THRESHOLDS.WARNING) {
    warnings.push({
      badge: 'Menu',
      message: `Om ${countdown.formatted.toLowerCase()}`,
      color: countdown.hours < DEADLINE_THRESHOLDS.URGENT ? COLOR.error : COLOR.warning,
      level: countdown.hours < DEADLINE_THRESHOLDS.URGENT ? 'urgent' : 'warning'
    })
  }

  // Grocery shopping deadline (before dinner)
  if (countdown.hours < DEADLINE_THRESHOLDS.WARNING && countdown.hours > 0) {
    warnings.push({
      badge: 'Indkøb',
      message: `Om ${countdown.formatted.toLowerCase()}`,
      color: countdown.hours < DEADLINE_THRESHOLDS.URGENT ? COLOR.error : COLOR.warning,
      level: countdown.hours < DEADLINE_THRESHOLDS.URGENT ? 'urgent' : 'warning'
    })
  }

  return warnings
})

// Booking status (informational only - uses existing canModifyOrders)
const bookingStatus = computed(() => {
  const isOpen = canModifyOrders(props.dinnerEvent.date)
  return {
    badge: 'Bestil',
    isOpen,
    message: isOpen ? 'Åben' : 'Lukket',
    color: COLOR.neutral
  }
})

// State badge configuration (from design system)
const stateBadge = computed(() => {
  return DINNER_STATE_BADGES[props.dinnerEvent.state as keyof typeof DINNER_STATE_BADGES] || DINNER_STATE_BADGES.SCHEDULED
})

// Menu title or placeholder
const menuTitle = computed(() => {
  return props.dinnerEvent.menuTitle || 'Menu ikke annonceret'
})

const isMenuAnnounced = computed(() => {
  return props.dinnerEvent.menuTitle && props.dinnerEvent.menuTitle !== 'TBD'
})

// Handle card click
const handleClick = () => {
  emit('select', props.dinnerEvent.id)
}
</script>

<template>
  <UCard
    :name="`chef-dinner-card-${dinnerEvent.id}`"
    :ui="{
      root: 'cursor-pointer transition-all hover:scale-[1.02]',
      ring: selected ? 'ring-2 ring-primary' : ''
    }"
    @click="handleClick"
  >
    <template #header>
      <div class="flex items-start justify-between gap-2">
        <!-- Date -->
        <div>
          <div class="text-sm font-semibold text-primary">
            {{ formattedShortDate }}
          </div>
          <div class="text-xs text-neutral-500 hidden md:block">
            {{ formattedDate }}
          </div>
        </div>

        <!-- State badge -->
        <UBadge
          :color="stateBadge.color"
          :icon="stateBadge.icon"
          variant="subtle"
          :size="SIZES.small.value"
        >
          {{ stateBadge.label }}
        </UBadge>
      </div>

      <!-- Chef action warnings (Menu, Indkøb) -->
      <div v-if="deadlineWarnings.length > 0" class="mt-2 space-y-1">
        <UAlert
          v-for="warning in deadlineWarnings"
          :key="warning.badge"
          :color="warning.color"
          variant="soft"
          icon="i-heroicons-exclamation-triangle"
          :ui="{ padding: 'p-2', title: 'text-xs' }"
        >
          <template #title>
            <div class="flex items-center gap-2">
              <UBadge :color="warning.color" variant="solid" :size="SIZES.small.value">
                {{ warning.badge }}
              </UBadge>
              <span>{{ warning.message }}</span>
            </div>
          </template>
        </UAlert>
      </div>

      <!-- Booking status (informational only) -->
      <div v-if="dinnerEvent.state === DinnerState.SCHEDULED" class="mt-2">
        <div class="flex items-center gap-2 text-xs text-neutral-500">
          <UBadge :color="bookingStatus.color" variant="subtle" :size="SIZES.small.value">
            {{ bookingStatus.badge }}
          </UBadge>
          <span>{{ bookingStatus.message }}</span>
        </div>
      </div>
    </template>

    <!-- Menu title -->
    <div class="py-2">
      <div
        :class="[
          'text-sm',
          isMenuAnnounced ? 'font-medium' : 'italic text-neutral-500'
        ]"
      >
        {{ menuTitle }}
      </div>

      <!-- Chef info if announced -->
      <div
        v-if="dinnerEvent.chefId"
        class="text-xs text-neutral-500 mt-1"
      >
        Chefkok tildelt
      </div>
    </div>
  </UCard>
</template>
