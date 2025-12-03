<script setup lang="ts">
/**
 * ChefDinnerCard - Dinner event card for chef master view
 *
 * Features:
 * - Display dinner date, menu, state
 * - Click to select dinner
 * - Menu status with urgency levels (0=compliant, 1=warning, 2=critical)
 * - Booking status (open/closed)
 * - State badges (SCHEDULED, ANNOUNCED, CANCELLED, CONSUMED)
 * - Visual selection state
 *
 * Used in:
 * - /chef/index.vue master view (dinner list)
 *
 * ADR Compliance:
 * - ADR-001: Types from validation composables, business logic in useSeason
 * - Uses getDeadlineUrgency() from useSeason (no manual thresholds)
 * - Uses URGENCY_TO_BADGE from design system
 * - Uses design system for card styling (CALENDAR, CHEF_CALENDAR)
 * - Mobile-first responsive design
 */
import type { DinnerEventDisplay } from '~/composables/useBookingValidation'
import type { NuxtUIColor } from '~/composables/useTheSlopeDesignSystem'

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
const { COLOR, SIZES, DINNER_STATE_BADGES, URGENCY_TO_BADGE, CALENDAR, CHEF_CALENDAR } = useTheSlopeDesignSystem()

// Time logic from useSeason (ADR-001: business logic in composables)
const { canModifyOrders, getDefaultDinnerStartTime, getDinnerTimeRange, getDeadlineUrgency } = useSeason()
const dinnerStartHour = getDefaultDinnerStartTime()

// Format dinner date (formatDate auto-imported from ~/utils/date, uses Danish locale)
const formattedShortDate = computed(() => formatDate(props.dinnerEvent.date))

// Menu status - uses getDeadlineUrgency from useSeason (same pattern as ChefMenuCard)
const menuStatus = computed(() => {
  const dinnerTimeRange = getDinnerTimeRange(props.dinnerEvent.date, dinnerStartHour, 0)
  const countdown = calculateCountdown(dinnerTimeRange.start)
  const urgency = getDeadlineUrgency(dinnerTimeRange.start)

  return {
    urgency,
    countdown,
    color: URGENCY_TO_BADGE[urgency].color
  }
})

// Menu status badge - derived from menuStatus (same pattern as ChefMenuCard)
const menuStatusBadge = computed(() => {
  const { urgency, countdown } = menuStatus.value
  const badge = URGENCY_TO_BADGE[urgency]
  return {
    color: badge.color,
    label: urgency === 0 ? badge.label : countdown.formatted
  }
})

// Booking status (informational only - uses existing canModifyOrders)
const bookingStatus = computed((): { badge: string; isOpen: boolean; message: string; color: NuxtUIColor } => {
  const isOpen = canModifyOrders(props.dinnerEvent.date)
  return {
    badge: 'Bestil',
    isOpen,
    message: isOpen ? 'Åben' : 'Lukket',
    color: isOpen ? COLOR.success : COLOR.neutral
  }
})

// State badge configuration (from design system)
const stateBadge = computed(() => {
  return DINNER_STATE_BADGES[props.dinnerEvent.state as keyof typeof DINNER_STATE_BADGES] || DINNER_STATE_BADGES.SCHEDULED
})

// Menu title or placeholder
const menuTitle = computed(() => props.dinnerEvent.menuTitle || 'Menu ikke annonceret')
const isMenuAnnounced = computed(() => props.dinnerEvent.menuTitle && props.dinnerEvent.menuTitle !== 'TBD')

// Handle card click
const handleClick = () => {
  emit('select', props.dinnerEvent.id)
}
</script>

<template>
  <UCard
    :name="`chef-dinner-card-${dinnerEvent.id}`"
    :ui="{
      root: `${CALENDAR.selection.card.base} ${selected ? CHEF_CALENDAR.selection : ''}`,
      body: 'p-3'
    }"
    @click="handleClick"
  >
    <div class="flex items-center gap-3">
      <!-- Date -->
      <div class="text-sm font-semibold text-primary w-12 shrink-0">
        {{ formattedShortDate }}
      </div>

      <!-- Menu title -->
      <div class="flex-1 min-w-0">
        <div :class="['text-sm truncate', isMenuAnnounced ? 'font-medium' : 'italic text-neutral-500']">
          {{ menuTitle }}
        </div>
      </div>

      <!-- State badge -->
      <UBadge
        :color="stateBadge.color"
        variant="subtle"
        :size="SIZES.small"
        class="shrink-0"
      >
        {{ stateBadge.label }}
      </UBadge>

      <!-- Menu status -->
      <UBadge
        :color="menuStatusBadge.color"
        variant="soft"
        :size="SIZES.small"
        class="shrink-0"
      >
        {{ menuStatusBadge.label }}
      </UBadge>

      <!-- Booking status -->
      <div class="flex items-center gap-1 shrink-0">
        <UBadge :color="bookingStatus.color" variant="subtle" :size="SIZES.small">
          {{ bookingStatus.badge }}
        </UBadge>
        <span class="text-xs text-neutral-500">{{ bookingStatus.message }}</span>
      </div>
    </div>
  </UCard>
</template>
