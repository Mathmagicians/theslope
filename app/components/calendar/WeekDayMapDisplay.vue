<script setup lang="ts">
/**
 * Visual check: /admin/planning, the cooking days compact and with checkboxes, none selected included, phone and desktop.
 */
import { WEEKDAYS } from '~/types/dateTypes'
import type { WeekDayMap, WeekDay } from '~/types/dateTypes'
import {COLOR, type NuxtUIBadgeColor} from '~/composables/useTheSlopeDesignSystem'

interface Props {
  modelValue?: WeekDayMap | null
  parentRestriction?: WeekDayMap | null
  compact?: boolean
  disabled?: boolean
  hideRestricted?: boolean
  label?: string
  name?: string
  color?: NuxtUIBadgeColor
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  parentRestriction: null,
  compact: false,
  disabled: false,
  hideRestricted: false,
  label: '',
  name: undefined,
  color: COLOR.success
})

const emit = defineEmits<{
  'update:modelValue': [value: WeekDayMap]
}>()

const { createDefaultWeekdayMap } = useWeekDayMapValidation()
const { NOISE, COMPONENTS } = useTheSlopeDesignSystem()
const display = COMPONENTS.weekDayMapDisplay

const selectedDays = computed(() => {
  if (!props.modelValue) return []

  return WEEKDAYS.filter(day => props.modelValue?.[day])
})

const formatDayCompact = (day: WeekDay) => {
  return day.substring(0, 3)
}

const isRestricted = (day: WeekDay) => {
  return props.parentRestriction ? !props.parentRestriction[day] : false
}

const visibleDays = computed(() =>
    props.hideRestricted ? WEEKDAYS.filter(day => !isRestricted(day)) : WEEKDAYS
)

const updateDay = (day: WeekDay, value: boolean | 'indeterminate') => {
  if (props.disabled) return

  // Treat indeterminate as false for weekday maps
  const boolValue = value === 'indeterminate' ? false : value

  const updated: WeekDayMap = props.modelValue
    ? { ...props.modelValue }
    : createDefaultWeekdayMap(false)

  updated[day] = boolValue
  emit('update:modelValue', updated)
}
</script>

<template>
  <!-- COMPACT VIEW: Only render selected days (no empty placeholders) -->
  <div v-if="compact && selectedDays.length > 0" :class="display.compactDays">
    <UBadge
      v-for="day in selectedDays"
      :key="day"
      :color="color"
      :class="display.day"
      :variant="NOISE.soft"
    >
      {{ formatDayCompact(day) }}
    </UBadge>
  </div>
  <span v-else-if="compact && selectedDays.length === 0" :class="display.noDays">
      💤
  </span>

  <!-- FULL VIEW: Show all days with checkboxes -->
  <UFormField v-else :label="label" :name="name">
    <div :class="display.checkboxes">
      <UCheckbox
        v-for="day in visibleDays"
        :key="day"
        :model-value="modelValue?.[day] ?? false"
        :label="day"
        :disabled="disabled || isRestricted(day)"
        :color="color"
        :class="display.day"
        @update:model-value="(value) => updateDay(day, value)"
      />
    </div>
  </UFormField>
</template>
