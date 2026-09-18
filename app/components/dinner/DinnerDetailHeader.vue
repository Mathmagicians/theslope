<script setup lang="ts">
/**
 * DinnerDetailHeader - Discrete header bar for dinner detail pages
 *
 * A subtle, informational header showing:
 * - Date navigation (← date →) with CalendarDateNav
 * - State badge (PLANLAGT, ANNONCERET, etc.)
 * - Heynabo external link (when available)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ [🟢 ANNONCERET]   [◀] 📅 Fredag 24. januar 2025 [▶]      [Heynabo →]  │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Design: Subtle, not competing with the hero below. Uses muted colors.
 */
import type {DinnerEventDetail} from '~/composables/useBookingValidation'
import type {NuxtUIColor} from '~/composables/useTheSlopeDesignSystem'

interface Props {
  dinnerEvent: DinnerEventDetail
  hasPrev?: boolean
  hasNext?: boolean
  calendarOpen?: boolean
  navColor?: NuxtUIColor
}

const props = withDefaults(defineProps<Props>(), {
  hasPrev: false,
  hasNext: false,
  calendarOpen: false,
  navColor: undefined
})

// Design system and validation
const {TYPOGRAPHY, ICONS, DINNER_STATE_BADGES, SIZES, IMG, BACKGROUNDS, COLOR} = useTheSlopeDesignSystem()
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

const emit = defineEmits<{
  prev: []
  next: []
  'toggle-calendar': []
}>()
</script>

<template>
  <div
    :class="`flex flex-col md:flex-row md:justify-between items-center gap-2 px-4 py-3 ${BACKGROUNDS.hero.mocha}`"
    data-testid="dinner-detail-header"
  >
    <!-- State badge (top on mobile, left on desktop) -->
    <div class="flex items-center gap-2">
      <UBadge
        :color="COLOR.mocha"
        :icon="stateBadge.icon"
        variant="outline"
        :size="SIZES.standard"
        :class="TYPOGRAPHY.bodyTextMedium"
      >
        {{ stateBadge.label }}
      </UBadge>
    </div>

    <!-- Date navigation (← date →) - CalendarDateNav for prev/next dinner navigation -->
    <CalendarDateNav
      :open="calendarOpen"
      :has-prev="hasPrev"
      :has-next="hasNext"
      :color="navColor"
      @prev="emit('prev')"
      @next="emit('next')"
      @toggle="emit('toggle-calendar')"
    >
      {{ formattedDate }}
    </CalendarDateNav>

    <!-- Heynabo link (bottom on mobile, right on desktop) -->
    <div class="flex items-center md:justify-end">
      <UButton
        v-if="heynaboEventUrl"
        :to="heynaboEventUrl"
        target="_blank"
        :color="COLOR.neutral"
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
