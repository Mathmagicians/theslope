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

interface Props {
  dinnerEvent: DinnerEventDetail
}

const props = defineProps<Props>()

// Design system and validation
const {TYPOGRAPHY, ICONS, DINNER_STATE_BADGES, SIZES, IMG, BACKGROUNDS} = useTheSlopeDesignSystem()
const {DinnerStateSchema} = useBookingValidation()
const DinnerState = DinnerStateSchema.enum

// Heynabo link
const {getEventUrl} = useHeynabo()
const heynaboEventUrl = computed(() => {
  if (!props.dinnerEvent.heynaboEventId) return null
  return getEventUrl(props.dinnerEvent.heynaboEventId)
})

// Formatted date
const formattedDate = computed(() => formatDate(props.dinnerEvent.date))

// State badge config
const stateBadge = computed(() => {
  const state = props.dinnerEvent.state as keyof typeof DINNER_STATE_BADGES
  const fallback = DinnerState.SCHEDULED as keyof typeof DINNER_STATE_BADGES
  return DINNER_STATE_BADGES[state] ?? DINNER_STATE_BADGES[fallback]
})
</script>

<template>
  <div
    :class="`flex flex-col md:grid md:grid-cols-3 items-center gap-2 px-4 py-3 ${BACKGROUNDS.hero.mocha}`"
    data-testid="dinner-detail-header"
  >
    <!-- State badge (top on mobile, left on desktop) -->
    <div class="flex items-center gap-2">
      <UBadge
        color="mocha"
        :icon="stateBadge.icon"
        variant="outline"
        :size="SIZES.standard"
        :class="TYPOGRAPHY.bodyTextMedium"
      >
        {{ stateBadge.label }}
      </UBadge>
    </div>

    <!-- Date (middle on mobile, center on desktop) -->
    <div class="flex items-center md:justify-center gap-2">
      <UIcon :name="ICONS.calendar" :size="SIZES.standardIconSize" />
      <span :class="TYPOGRAPHY.bodyTextMedium" class="capitalize">
        {{ formattedDate }}
      </span>
    </div>

    <!-- Heynabo link (bottom on mobile, right on desktop) -->
    <div class="flex items-center md:justify-end">
      <UButton
        v-if="heynaboEventUrl"
        :to="heynaboEventUrl"
        target="_blank"
        color="neutral"
        variant="ghost"
        :size="SIZES.standard"
        :avatar="{src: IMG.heynabo, alt: 'Heynabo'}"
        :trailing-icon="ICONS.arrowRight"
        class="!text-[inherit]"
        name="heynabo-event-link"
      >
        Se på Heynabo
      </UButton>
    </div>
  </div>
</template>
