<script setup lang="ts">
/**
 * BookingViewSwitcher - Toggle between Day/Week/Month booking views
 *
 * Button group pattern (same as FormModeSelector):
 * - Mobile: icons only
 * - Desktop: icons + labels
 *
 * ┌────────┬────────┬────────┐
 * │ 📅     │ 📅📅   │ ▦      │  Mobile (icons only)
 * └────────┴────────┴────────┘
 *
 * ┌────────────┬────────────┬────────────┐
 * │ 📅 Dag     │ 📅 Uge     │ ▦ Måned    │  Desktop (icons + labels)
 * │  (active)  │            │            │
 * └────────────┴────────────┴────────────┘
 */

import {type BookingView, BookingViewSchema} from '~/composables/useBookingView'

const model = defineModel<BookingView>({default: 'day'})

const {COLOR, ICONS, SIZES} = useTheSlopeDesignSystem()

const VIEW_CONFIG: Record<BookingView, { label: string; icon: string }> = {
    day: {label: 'Dag', icon: ICONS.calendar},
    week: {label: 'Uge', icon: ICONS.calendarDays},
    month: {label: 'Måned', icon: ICONS.clipboard}
}

const views = BookingViewSchema.options

const isSelected = (view: BookingView) => model.value === view
const getVariant = (view: BookingView) => isSelected(view) ? 'solid' : 'outline'
</script>

<template>
  <UFieldGroup :size="SIZES.small" orientation="horizontal">
    <UButton
      v-for="view in views"
      :key="view"
      :data-testid="`booking-view-${view}`"
      :variant="getVariant(view)"
      :color="COLOR.primary"
      :active="isSelected(view)"
      active-class="ring-2 border-2 ring-orange-200 shadow-md"
      @click="model = view"
    >
      <template #leading>
        <UIcon :name="VIEW_CONFIG[view].icon" />
      </template>
      <span class="hidden md:block">{{ VIEW_CONFIG[view].label }}</span>
    </UButton>
  </UFieldGroup>
</template>
