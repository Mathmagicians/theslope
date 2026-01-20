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
 */
import type {NuxtUIColor} from '~/composables/useTheSlopeDesignSystem'

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
  color: 'neutral'
})

const {ICONS, SIZES} = useTheSlopeDesignSystem()

const emit = defineEmits<{
  prev: []
  next: []
  toggle: []
}>()
</script>

<template>
  <div class="flex items-center justify-center gap-1">
    <UButton
      v-if="hasPrev"
      :icon="ICONS.arrowLeft"
      :color="color"
      variant="ghost"
      :size="SIZES.md"
      :disabled="disabled"
      aria-label="Forrige"
      data-testid="date-nav-prev"
      @click="emit('prev')"
    />
    <UButton
      color="mocha"
      :variant="open ? 'outline' : 'ghost'"
      :size="SIZES.md"
      :disabled="disabled"
      :leading-icon="ICONS.calendar"
      :trailing-icon="open ? ICONS.chevronUp : ICONS.chevronDown"
      class="!text-[inherit]"
      data-testid="date-nav-toggle"
      @click="emit('toggle')"
    >
      <slot />
    </UButton>
    <UButton
      v-if="hasNext"
      :icon="ICONS.arrowRight"
      :color="color"
      variant="ghost"
      :size="SIZES.md"
      :disabled="disabled"
      aria-label="Næste"
      data-testid="date-nav-next"
      @click="emit('next')"
    />
  </div>
</template>
