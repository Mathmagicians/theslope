<script setup lang="ts">
/**
 * DeadlineBadge - Simple, reusable deadline status badge
 *
 * Takes pre-computed badge data and renders it. No business logic here.
 * Use badge factories from useBookingUi (createBookingBadge, createDiningModeBadge)
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

const {SIZES, TYPOGRAPHY, TEXT} = useTheSlopeDesignSystem()
</script>

<template>
  <div data-testid="deadline-badge" class="flex flex-col items-start">
    <UBadge :color="badge.color" :icon="badge.icon" variant="soft" :size="SIZES.small">
      <template v-if="!compact">{{ badge.label }}: </template>
      {{ badge.value }}
    </UBadge>
    <span v-if="!compact" :class="[TYPOGRAPHY.finePrint, TEXT.muted, 'mt-0.5']">
      {{ badge.helpText }}
    </span>
  </div>
</template>
