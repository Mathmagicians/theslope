<script setup lang="ts">
/**
 * DinnerDetailHeader - Discrete header bar for dinner detail pages
 *
 * A subtle, informational header showing:
 * - Date (formatted nicely)
 * - State badge (PLANLAGT, ANNONCERET, etc.)
 * - Heynabo external link (when available)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ 📅 Fredag 24. januar 2025          [🟢 ANNONCERET]        [Heynabo →]  │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Design: Subtle, not competing with the hero below. Uses muted colors.
 */
import type {DinnerEventDetail} from '~/composables/useBookingValidation'
import {format} from 'date-fns'
import {da} from 'date-fns/locale'

interface Props {
  dinnerEvent: DinnerEventDetail
}

const props = defineProps<Props>()

// Design system
const {TYPOGRAPHY, ICONS, DINNER_STATE_BADGES, SIZES, IMG, BACKGROUNDS} = useTheSlopeDesignSystem()

// Heynabo link
const {getEventUrl} = useHeynabo()
const heynaboEventUrl = computed(() => {
  if (!props.dinnerEvent.heynaboEventId) return null
  return getEventUrl(props.dinnerEvent.heynaboEventId)
})

// Formatted date
const formattedDate = computed(() => {
  return format(props.dinnerEvent.date, "EEEE d. MMMM yyyy", {locale: da})
})

// State badge config
const stateBadge = computed(() => {
  return DINNER_STATE_BADGES[props.dinnerEvent.state as keyof typeof DINNER_STATE_BADGES]
    || DINNER_STATE_BADGES.SCHEDULED
})
</script>

<template>
  <div
    :class="`grid grid-cols-3 items-center gap-2 px-4 py-3 ${BACKGROUNDS.hero.mocha}`"
    data-testid="dinner-detail-header"
  >
    <!-- Left: State badge -->
    <div class="flex items-center gap-2">
      <UBadge
        :color="stateBadge.color"
        :icon="stateBadge.icon"
        variant="subtle"
        :size="SIZES.small.value"
      >
        {{ stateBadge.label }}
      </UBadge>
    </div>

    <!-- Center: Date -->
    <div class="flex items-center justify-center gap-2">
      <UIcon :name="ICONS.calendar" class="w-4 h-4" />
      <span :class="TYPOGRAPHY.bodyTextMedium" class="capitalize">
        {{ formattedDate }}
      </span>
    </div>

    <!-- Right: Heynabo link -->
    <div class="flex items-center justify-end">
      <UTooltip v-if="heynaboEventUrl" text="Se på Heynabo">
        <UButton
          :to="heynaboEventUrl"
          target="_blank"
          color="neutral"
          variant="ghost"
          size="xs"
          name="heynabo-event-link"
          :avatar="{src: IMG.heynabo, alt: 'Heynabo'}"
        />
      </UTooltip>
    </div>
  </div>
</template>
