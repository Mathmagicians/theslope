<script setup lang="ts">
import { WEEKDAYS } from '~/types/dateTypes'
import type { WeekDayMap } from '~/types/dateTypes'
import type { BadgeProps } from '#ui/types'

interface Props {
  modelValue?: WeekDayMap | null
  compact?: boolean
  disabled?: boolean
  label?: string
  color?: BadgeProps['color']
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
  disabled: false,
  label: '',
  color: 'success'
})

const emit = defineEmits<{
  'update:modelValue': [value: WeekDayMap]
}>()

const { createDefaultWeekdayMap } = useWeekDayMapValidation()

// Compute selected days for compact view
const selectedDays = computed(() => {
  if (!props.modelValue) return []

  return WEEKDAYS.filter(day => props.modelValue[day])
})

// Format day for compact display (first 3 letters, capitalized)
const formatDayCompact = (day: string) => {
  return day.substring(0, 3)
}

// Computed display text for compact mode
const compactDisplay = computed(() => {
  if (!props.modelValue || selectedDays.value.length === 0) {
    return '💤'
  }
  return selectedDays.value.map(formatDayCompact)
})

// Update local model value
const updateDay = (day: string, value: boolean) => {
  if (props.disabled) return

  // Initialize with all days set to false if modelValue is null/undefined
  const updated: WeekDayMap = props.modelValue
    ? { ...props.modelValue }
    : createDefaultWeekdayMap(false)

  updated[day] = value
  emit('update:modelValue', updated)
}
</script>

<template>
  <!-- COMPACT VIEW: Show only selected days as text -->
  <div v-if="compact && selectedDays.length > 0" class="text-sm">
    <UBadge :color="color" class="capitalize mr-1" variant="soft"
            v-for="day in selectedDays" :key="day" >
      {{ formatDayCompact(day)}}
    </UBadge>
  </div>
  <span v-else-if="compact && selectedDays.length === 0" class="text-lg">
      💤
  </span>

  <!-- FULL VIEW: Show all days with checkboxes -->
  <UFormField v-else :label="label">
    <div class="flex flex-col gap-3">
      <UCheckbox
        v-for="day in WEEKDAYS"
        :key="day"
        :model-value="modelValue?.[day] ?? false"
        :label="day"
        :disabled="disabled"
        :color="color"
        class="capitalize"
        @update:model-value="(value: boolean) => updateDay(day, value)"
      />
    </div>
  </UFormField>
</template>
