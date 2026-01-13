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
 */
interface Props {
  hasPrev?: boolean
  hasNext?: boolean
  disabled?: boolean
  open?: boolean
}

withDefaults(defineProps<Props>(), {
  hasPrev: true,
  hasNext: true,
  disabled: false,
  open: true
})

const emit = defineEmits<{
  prev: []
  next: []
  toggle: []
}>()

const {ICONS, COLOR, SIZES} = useTheSlopeDesignSystem()
</script>

<template>
  <div class="flex items-center justify-center gap-1">
    <UButton
      v-if="hasPrev"
      :icon="ICONS.arrowLeft"
      :color="COLOR.neutral"
      variant="ghost"
      :size="SIZES.md"
      :disabled="disabled"
      aria-label="Forrige"
      data-testid="date-nav-prev"
      @click="emit('prev')"
    />
    <UButton
      :color="COLOR.neutral"
      :variant="open ? 'soft' : 'ghost'"
      :size="SIZES.md"
      :disabled="disabled"
      data-testid="date-nav-toggle"
      @click="emit('toggle')"
    >
      <UIcon :name="ICONS.calendar" class="size-4" />
      <slot />
      <UIcon :name="open ? ICONS.chevronUp : ICONS.chevronDown" class="size-3" />
    </UButton>
    <UButton
      v-if="hasNext"
      :icon="ICONS.arrowRight"
      :color="COLOR.neutral"
      variant="ghost"
      :size="SIZES.md"
      :disabled="disabled"
      aria-label="Næste"
      data-testid="date-nav-next"
      @click="emit('next')"
    />
  </div>
</template>
