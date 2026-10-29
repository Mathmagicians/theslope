<script setup lang="ts">
/**
 * ChefDinnerCard - Dinner event card for chef agenda/list view
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * COMPACT VERTICAL LAYOUT (fits narrow sidebar)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                        Lør 16/01                     ← Date (accent)    │
 * │                   Spaghetti Carbonara                ← Menu title       │
 * │                                                                         │
 * │                   Status: [Planlagt]                                    │
 * │                   Menu: [om 2d 4t]                   ← Color on value   │
 * │                   Bestilling: [Åben]                                    │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Color coding (matches calendar view):
 * - Next: Ocean bold (today's/next cooking)
 * - Future: Ocean light (upcoming)
 * - Past: Mocha (archived)
 *
 * Features:
 * - Compact vertical layout for narrow sidebar
 * - Uses createChefBadges factory (useBookingUi) for status/deadline display
 * - Click to select dinner
 * - Visual selection state (ring accent)
 * - Temporal color coding (consistent with calendar)
 *
 * Used in:
 * - ChefCalendarDisplay agenda view
 *
 * ADR Compliance:
 * - ADR-001: Types from validation composables, badge factory in useBooking
 * - Uses design system for card styling (COMPONENTS.chefDinnerCard, CALENDAR, CHEF_CALENDAR)
 * - Mobile-first responsive design
 */
import type { DinnerEventDisplay } from '~/composables/useBookingValidation'
import type { SeasonDeadlines } from '~/composables/useSeason'
import type { TemporalCategory } from '~/utils/season'

interface Props {
  dinnerEvent: DinnerEventDisplay
  deadlines: SeasonDeadlines
  selected?: boolean
  temporalCategory?: TemporalCategory
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
  temporalCategory: TEMPORAL_CATEGORY.future
})

const emit = defineEmits<{
  select: [dinnerEventId: number]
}>()

// Design system & badge factory
const { CALENDAR, CHEF_CALENDAR, COMPONENTS, dayColorClass } = useTheSlopeDesignSystem()
const { createChefBadges } = useBookingUi()

// Get released ticket count from store (for booking badge)
const bookingsStore = useBookingsStore()
const releasedTicketCount = computed(() => bookingsStore.lockStatus.get(props.dinnerEvent.id) ?? undefined)

// Chef workflow badges (pass released count for booking badge), counted from the page's clock
const now = useClock()
const badges = computed(() => createChefBadges(props.dinnerEvent, props.deadlines, now.value, releasedTicketCount.value))

// The date wears the calendar's colour for its category; a cancelled dinner wears the past
const dateColorClass = computed(() => isCancelled.value ? CALENDAR.day.past : dayColorClass(CHEF_CALENDAR, props.temporalCategory))

// Format dinner date with weekday (matches countdown timer style: "Lør 16/01")
const formattedDate = computed(() => formatDanishWeekdayDate(props.dinnerEvent.date))

// Menu title or placeholder
const menuTitle = computed(() => props.dinnerEvent.menuTitle || 'Ingen menu endnu')
const isMenuAnnounced = computed(() => !!props.dinnerEvent.menuTitle)

// Check if dinner is cancelled
const isCancelled = computed(() => isDinnerCancelled(props.dinnerEvent))

// Handle card click
const handleClick = () => {
  emit('select', props.dinnerEvent.id)
}
</script>

<template>
  <div :data-testid="`chef-dinner-card-${dinnerEvent.id}`" @click="handleClick">
  <UCard
    :ui="COMPONENTS.chefDinnerCard.ui(selected)"
  >
    <!-- Compact vertical layout (fits narrow sidebar) -->
    <div :class="COMPONENTS.chefDinnerCard.stack">
      <!-- Date with weekday (color matches temporal category) -->
      <div :class="COMPONENTS.chefDinnerCard.dateRow">
        <div :class="[COMPONENTS.chefDinnerCard.date, dateColorClass, isCancelled ? COMPONENTS.chefDinnerCard.dateCancelled : '']">
          {{ formattedDate }}
        </div>
      </div>

      <!-- Menu title -->
      <div
        :class="[COMPONENTS.chefDinnerCard.menuTitle, isMenuAnnounced ? '' : COMPONENTS.chefDinnerCard.menuPlaceholder]"
      >
        {{ menuTitle }}
      </div>

      <!-- Status/deadline badges - hidden for past events and cancelled -->
      <div v-if="temporalCategory !== TEMPORAL_CATEGORY.past && !isCancelled" :class="COMPONENTS.chefDinnerCard.badges">
        <DeadlineBadge v-for="badge in badges.values()" :key="badge.step" :badge="badge" />
      </div>
    </div>
  </UCard>
  </div>
</template>
