<script setup lang="ts">
/**
 * BookingViewSwitcher - Toggle between Day/Week/Month booking views
 *
 * Button group pattern:
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
import {DATE_WORDS} from '~/config/dateWords'

const model = defineModel<BookingView>({default: BookingViewSchema.enum.day})

const {COLOR, NOISE, ICONS, SIZES, COMPONENTS, ORIENTATIONS} = useTheSlopeDesignSystem()

const View = BookingViewSchema.enum
const VIEW_ICONS: Record<BookingView, string> = {
    [View.day]: ICONS.calendar,
    [View.week]: ICONS.calendarDays,
    [View.month]: ICONS.clipboard
}

const views = BookingViewSchema.options

const isSelected = (view: BookingView) => model.value === view
const getVariant = (view: BookingView) => isSelected(view) ? NOISE.loud : NOISE.medium
</script>

<template>
  <UFieldGroup :size="SIZES.standard" :orientation="ORIENTATIONS.horizontal">
    <UButton
      v-for="view in views"
      :key="view"
      :data-testid="`booking-view-${view}`"
      :variant="getVariant(view)"
      :color="COLOR.primary"
      :active="isSelected(view)"
      :active-class="COMPONENTS.segmentedActive"
      @click="model = view"
    >
      <template #leading>
        <UIcon :name="VIEW_ICONS[view]" />
      </template>
      <span :class="COMPONENTS.bookingViewSwitcher.label">{{ DATE_WORDS.periodViews[view] }}</span>
    </UButton>
  </UFieldGroup>
</template>
