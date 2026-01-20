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
 * - Uses createChefBadges factory for status/deadline display
 * - Click to select dinner
 * - Visual selection state (ring accent)
 * - Temporal color coding (consistent with calendar)
 *
 * Used in:
 * - ChefCalendarDisplay agenda view
 *
 * ADR Compliance:
 * - ADR-001: Types from validation composables, badge factory in useBooking
 * - Uses design system for card styling (CALENDAR, CHEF_CALENDAR)
 * - Mobile-first responsive design
 */
import type { DinnerEventDisplay } from '~/composables/useBookingValidation'
import type { TemporalCategory, SeasonDeadlines } from '~/composables/useSeason'

interface Props {
  dinnerEvent: DinnerEventDisplay
  deadlines: SeasonDeadlines
  selected?: boolean
  temporalCategory?: TemporalCategory
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
  temporalCategory: 'future'
})

const emit = defineEmits<{
  select: [dinnerEventId: number]
}>()

// Design system & badge factory
const { CALENDAR, CHEF_CALENDAR, TYPOGRAPHY } = useTheSlopeDesignSystem()
const { createChefBadges } = useBooking()

// Get released ticket count from store (for booking badge)
const bookingsStore = useBookingsStore()
const releasedTicketCount = computed(() => bookingsStore.lockStatus.get(props.dinnerEvent.id) ?? undefined)

// Chef workflow badges (pass released count for booking badge)
const badges = computed(() => createChefBadges(props.dinnerEvent, props.deadlines, releasedTicketCount.value))

// Get color class based on temporal category (matches calendar view)
// Use past styling for cancelled dinners
const dateColorClass = computed(() => {
  if (isCancelled.value) return CALENDAR.day.past
  return props.temporalCategory === 'past' ? CALENDAR.day.past : CHEF_CALENDAR.day[props.temporalCategory]
})

// Format dinner date with weekday (matches countdown timer style: "Lør 16/01")
const formattedDate = computed(() => formatDanishWeekdayDate(props.dinnerEvent.date))

// Menu title or placeholder
const menuTitle = computed(() => props.dinnerEvent.menuTitle || 'Ingen menu endnu')
const isMenuAnnounced = computed(() => !!props.dinnerEvent.menuTitle)

// Check if dinner is cancelled
const {DinnerStateSchema} = useBookingValidation()
const DinnerState = DinnerStateSchema.enum
const isCancelled = computed(() => props.dinnerEvent.state === DinnerState.CANCELLED)

// Handle card click
const handleClick = () => {
  emit('select', props.dinnerEvent.id)
}
</script>

<template>
  <div :data-testid="`chef-dinner-card-${dinnerEvent.id}`" @click="handleClick">
  <UCard
    :ui="{
      root: `cursor-pointer transition-shadow duration-200 hover:shadow-lg w-full ${selected ? CHEF_CALENDAR.selection : ''}`,
      body: 'p-1.5 md:p-3 w-full'
    }"
  >
    <!-- Compact vertical layout (fits narrow sidebar) -->
    <div class="space-y-0.5 md:space-y-1 w-full">
      <!-- Date with weekday (color matches temporal category) -->
      <div class="text-center">
        <div :class="[dateColorClass, isCancelled ? 'line-through' : '']" class="text-sm font-semibold rounded-md px-2 py-0.5 inline-block">
          {{ formattedDate }}
        </div>
      </div>

      <!-- Menu title -->
      <div
        :class="[
          TYPOGRAPHY.bodyTextMedium,
          'line-clamp-2 text-balance text-center',
          isMenuAnnounced ? '' : 'italic text-neutral-500'
        ]"
      >
        {{ menuTitle }}
      </div>

      <!-- Status/deadline badges - hidden for past events and cancelled -->
      <div v-if="temporalCategory !== 'past' && !isCancelled" class="pt-0.5 md:pt-1 space-y-0.5">
        <DeadlineBadge v-for="badge in badges.values()" :key="badge.step" :badge="badge" />
      </div>
    </div>
  </UCard>
  </div>
</template>
