<script setup lang="ts">
/**
 * DeadlineBadge - Simple, reusable deadline status badge
 *
 * Takes pre-computed badge data and renders it. No business logic here.
 * Use badge factories from useBooking (createBookingBadge, createDiningModeBadge)
 *
 * Usage:
 *   <DeadlineBadge :badge="bookingBadge" />
 *   <DeadlineBadge :badge="diningModeBadge" compact />
 */
import type {DeadlineBadgeData} from '~/composables/useBooking'

interface Props {
  badge: DeadlineBadgeData
  compact?: boolean  // Hide label and help text (for stepper mode)
}

withDefaults(defineProps<Props>(), {
  compact: false
})

const {SIZES} = useTheSlopeDesignSystem()
</script>

<template>
  <div class="flex flex-col items-start">
    <UBadge :color="badge.color" :icon="badge.icon" variant="soft" :size="SIZES.small">
      <template v-if="!compact">{{ badge.label }}: </template>
      {{ badge.value }}
    </UBadge>
    <span v-if="!compact" class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
      {{ badge.helpText }}
    </span>
  </div>
</template>
