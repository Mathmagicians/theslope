<script setup lang="ts">
/**
 * CalendarDateNav - Shared date navigation header
 *
 * ┌──────────────────────────────────────────────────┐
 * │   ◀   [ 📅 slot content ▼ ]   ▶                 │
 * └──────────────────────────────────────────────────┘
 *
 * - Center button contains slot (clickable for toggle)
 * - Emits prev/next/toggle
 * - hasPrev/hasNext control arrow visibility
 * - disabled disables all buttons (e.g. during save)
 * - color configures button color (default: neutral)
 *
 * Visual check: /dinner, the date toggle open and closed with both arrows, phone and desktop.
 */
import {COLOR, type NuxtUIColor} from '~/composables/useTheSlopeDesignSystem'
import {DATE_WORDS} from '~/config/dateWords'

interface Props {
  hasPrev?: boolean
  hasNext?: boolean
  disabled?: boolean
  open?: boolean
  color?: NuxtUIColor
}

withDefaults(defineProps<Props>(), {
  hasPrev: true,
  hasNext: true,
  disabled: false,
  open: true,
  color: COLOR.neutral
})

const {ICONS, SIZES, NOISE, COMPONENTS} = useTheSlopeDesignSystem()
const nav = COMPONENTS.calendarDateNav

const emit = defineEmits<{
  prev: []
  next: []
  toggle: []
}>()
</script>

<template>
  <div :class="nav.row">
    <UButton
      v-if="hasPrev"
      :icon="ICONS.arrowLeft"
      :color="color"
      :variant="NOISE.quiet"
      :size="SIZES.md"
      :disabled="disabled"
      :aria-label="DATE_WORDS.dateNav.previous"
      data-testid="date-nav-prev"
      @click="emit('prev')"
    />
    <UButton
      :color="COLOR.mocha"
      :variant="open ? NOISE.medium : NOISE.quiet"
      :size="SIZES.md"
      :disabled="disabled"
      :leading-icon="ICONS.calendar"
      :trailing-icon="open ? ICONS.chevronUp : ICONS.chevronDown"
      :class="nav.toggle"
      data-testid="date-nav-toggle"
      @click="emit('toggle')"
    >
      <slot />
    </UButton>
    <UButton
      v-if="hasNext"
      :icon="ICONS.arrowRight"
      :color="color"
      :variant="NOISE.quiet"
      :size="SIZES.md"
      :disabled="disabled"
      :aria-label="DATE_WORDS.dateNav.next"
      data-testid="date-nav-next"
      @click="emit('next')"
    />
  </div>
</template>
