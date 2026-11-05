<script setup lang="ts">
/**
 * DeadlineBadge - Simple, reusable deadline status badge
 *
 * Takes pre-computed badge data and renders it. No business logic here.
 * Use badge factories from useBookingUi (createBookingBadge, createDiningModeBadge, createTicketStateBadge)
 *
 * Usage:
 *   <DeadlineBadge :badge="bookingBadge" />
 *   <DeadlineBadge :badge="diningModeBadge" compact />
 */
import type {DeadlineBadgeData} from '~/composables/useBookingUi'

interface Props {
  badge: DeadlineBadgeData
  compact?: boolean  // Hide label and help text (for stepper mode)
}

withDefaults(defineProps<Props>(), {
  compact: false
})

const {SIZES, COMPONENTS, NOISE} = useTheSlopeDesignSystem()
</script>

<template>
  <div data-testid="deadline-badge" :class="COMPONENTS.deadlineBadge.root">
    <UBadge :color="badge.color" :icon="badge.icon" :variant="NOISE.soft" :size="SIZES.small">
      <template v-if="!compact">{{ badge.label }}: </template>
      {{ badge.value }}
    </UBadge>
    <span v-if="!compact" :class="COMPONENTS.deadlineBadge.helpText">
      {{ badge.helpText }}
    </span>
  </div>
</template>
