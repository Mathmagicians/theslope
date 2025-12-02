<script setup lang="ts">
import { WEEKDAYS } from '~/types/dateTypes'
import type { WeekDayMap, WeekDay } from '~/types/dateTypes'
import type { BadgeProps } from '#ui/types'

interface Props {
  modelValue?: WeekDayMap | null
  parentRestriction?: WeekDayMap | null
  compact?: boolean
  disabled?: boolean
  label?: string
  name?: string
  color?: BadgeProps['color']
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  parentRestriction: null,
  compact: false,
  disabled: false,
  label: '',
  name: undefined,
  color: 'success'
})

const emit = defineEmits<{
  'update:modelValue': [value: WeekDayMap]
}>()

const { createDefaultWeekdayMap } = useWeekDayMapValidation()

// Compute selected days for compact view
const selectedDays = computed(() => {
  if (!props.modelValue) return []

  return WEEKDAYS.filter(day => props.modelValue?.[day])
})

// Format day for compact display (first 3 letters)
const formatDayCompact = (day: WeekDay) => {
  return day.substring(0, 3)
}

const isRestricted = (day: WeekDay) => {
  return props.parentRestriction ? !props.parentRestriction[day] : false
}

// Update local model value
const updateDay = (day: WeekDay, value: boolean | 'indeterminate') => {
  if (props.disabled) return

  // Treat indeterminate as false for weekday maps
  const boolValue = value === 'indeterminate' ? false : value

  // Initialize with all days set to false if modelValue is null/undefined
  const updated: WeekDayMap = props.modelValue
    ? { ...props.modelValue }
    : createDefaultWeekdayMap(false)

  updated[day] = boolValue
  emit('update:modelValue', updated)
}
</script>

<template>
  <!-- COMPACT VIEW: Show all 7 weekdays with badges for selected days only -->
  <div v-if="compact && selectedDays.length > 0" class="flex gap-1">
    <div v-for="day in WEEKDAYS" :key="day" class="w-12 flex justify-center">
      <UBadge
        v-if="modelValue?.[day]"
        :color="color"
        class="capitalize"
        variant="soft"
      >
        {{ formatDayCompact(day) }}
      </UBadge>
    </div>
  </div>
  <span v-else-if="compact && selectedDays.length === 0" class="text-lg">
      💤
  </span>

  <!-- FULL VIEW: Show all days with checkboxes -->
  <UFormField v-else :label="label" :name="name">
    <div class="flex flex-col gap-3">
      <UCheckbox
        v-for="day in WEEKDAYS"
        :key="day"
        :model-value="modelValue?.[day] ?? false"
        :label="day"
    i soi d    :disabled="disabled || isRestricted(day)"
        :color="color"
        class="capitalize"
        @update:model-value="(value) => updateDay(day, value)"
      />
    </div>
  </UFormField>
</template>
