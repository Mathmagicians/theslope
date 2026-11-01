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
 *
 * Visual check: /dinner and /chef, a dinner with and without a Heynabo event, phone and desktop.
 */
import type {DinnerEventDetail} from '~/composables/useBookingValidation'
import type {NuxtUIColor} from '~/composables/useTheSlopeDesignSystem'
import {BUTTON_WORDS} from '~/config/buttonWords'

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

const {TYPOGRAPHY, ICONS, DINNER_STATE_BADGES, SIZES, IMG, COMPONENTS, COLOR, NOISE} = useTheSlopeDesignSystem()
const header = COMPONENTS.dinnerDetailHeader

const eventUrlOf = getEventUrl(useRuntimeConfig().public.HEY_NABO_API)
const heynaboEventUrl = computed(() => {
  if (!props.dinnerEvent.heynaboEventId) return null
  return eventUrlOf(props.dinnerEvent.heynaboEventId)
})

const formattedDate = computed(() => formatDate(props.dinnerEvent.date))

const stateBadge = computed(() => DINNER_STATE_BADGES[props.dinnerEvent.state])

const emit = defineEmits<{
  prev: []
  next: []
  'toggle-calendar': []
}>()
</script>

<template>
  <div
    :class="header.root"
    data-testid="dinner-detail-header"
  >
    <!-- State badge (top on mobile, left on desktop) -->
    <div :class="header.badgeColumn">
      <UBadge
        :color="COLOR.mocha"
        :icon="stateBadge.icon"
        :variant="NOISE.medium"
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
    <div :class="header.linkColumn">
      <UButton
        v-if="heynaboEventUrl"
        :to="heynaboEventUrl"
        target="_blank"
        :color="COLOR.neutral"
        :variant="NOISE.quiet"
        :size="SIZES.standard"
        :avatar="{src: IMG.heynabo, alt: BUTTON_WORDS.heynabo.name}"
        :trailing-icon="ICONS.arrowRight"
        :class="header.heynaboLink"
        name="heynabo-event-link"
      >
        {{ BUTTON_WORDS.heynabo.openEvent }}
      </UButton>
    </div>
  </div>
</template>
