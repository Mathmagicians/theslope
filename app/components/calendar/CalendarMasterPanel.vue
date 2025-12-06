<script setup lang="ts">
/**
 * CalendarMasterPanel - Consistent wrapper for calendar master panels
 *
 * Provides consistent structure with customizable slots for:
 * - header: Selectors, filters, team status, etc.
 * - calendar: The actual calendar component
 * - footer: Legend, statistics, etc.
 *
 * Used by:
 * - /dinner page: DinnerCalendarDisplay with countdown timer
 * - /chef page: MyTeamSelector + TeamRoleStatus + TeamCalendarDisplay
 *
 * Features:
 * - Consistent card structure across master panels
 * - Optional header/footer slots for flexibility
 * - Mobile-first responsive design
 * - Full-height flex layout
 */
interface Props {
  title: string
}

defineProps<Props>()

interface Slots {
  header?: () => unknown      // Optional: Team selector, filters, status, etc.
  calendar: () => unknown     // Required: The actual calendar component
  footer?: () => unknown      // Optional: Legend, stats, etc.
}

defineSlots<Slots>()

// Design system
const { TYPOGRAPHY, LAYOUTS } = useTheSlopeDesignSystem()
</script>

<template>
  <UCard :class="LAYOUTS.cardResponsive" :ui="{ root: 'flex flex-col h-full' }">
    <template #header>
      <h3 :class="TYPOGRAPHY.cardTitle">{{ title }}</h3>
    </template>

    <!-- Optional header content (selectors, filters) -->
    <div v-if="$slots.header" class="pt-2 pb-2 md:pt-4 md:pb-6">
      <slot name="header" />
    </div>

    <!-- Main calendar (required) -->
    <div class="flex-1 overflow-auto py-1 md:py-4">
      <slot name="calendar" />
    </div>

    <!-- Optional footer (legend, etc.) -->
    <div v-if="$slots.footer" class="px-4 pb-4 pt-4 md:pt-6">
      <slot name="footer" />
    </div>
  </UCard>
</template>
