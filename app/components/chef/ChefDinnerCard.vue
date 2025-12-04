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
 * - Uses DinnerDeadlineBadges for status/deadline display
 * - Click to select dinner
 * - Visual selection state (ring accent)
 * - Temporal color coding (consistent with calendar)
 *
 * Used in:
 * - ChefCalendarDisplay agenda view
 *
 * ADR Compliance:
 * - ADR-001: Types from validation composables
 * - Uses DinnerDeadlineBadges for shared deadline logic
 * - Uses design system for card styling (CALENDAR, CHEF_CALENDAR)
 * - Mobile-first responsive design
 */
import type { DinnerEventDisplay } from '~/composables/useBookingValidation'
import type { TemporalCategory } from '~/composables/useSeason'

interface Props {
  dinnerEvent: DinnerEventDisplay
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

// Design system
const { CALENDAR, CHEF_CALENDAR } = useTheSlopeDesignSystem()

// Get color class based on temporal category (matches calendar view)
const dateColorClass = computed(() =>
  props.temporalCategory === 'past' ? CALENDAR.day.past : CHEF_CALENDAR.day[props.temporalCategory]
)

// Format dinner date with weekday (matches countdown timer style: "Lør 16/01")
const formattedDate = computed(() => formatDanishWeekdayDate(props.dinnerEvent.date))

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
    <!-- Compact vertical layout (fits narrow sidebar) -->
    <div class="text-center space-y-1">
      <!-- Date with weekday (color matches temporal category) -->
      <div :class="dateColorClass" class="text-sm font-semibold rounded-md px-2 py-0.5 inline-block">
        {{ formattedDate }}
      </div>

      <!-- Menu title -->
      <div :class="['text-sm truncate', isMenuAnnounced ? 'font-medium' : 'italic text-neutral-500']">
        {{ menuTitle }}
      </div>

      <!-- Status/deadline badges (standalone mode for agenda) - hidden for past events -->
      <div v-if="temporalCategory !== 'past'" class="pt-1">
        <DinnerDeadlineBadges :dinner-event="dinnerEvent" mode="standalone" />
      </div>
    </div>
  </UCard>
</template>
