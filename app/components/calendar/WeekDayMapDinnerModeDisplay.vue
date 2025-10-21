<script setup lang="ts">
/**
 * WeekDayMapDinnerModeDisplay - Display and edit DinnerMode preferences for each weekday
 *
 * Similar to WeekDayMapDisplay but for DinnerMode enum values instead of boolean
 * Supports compact (icon badges) and full (radio buttons) views
 */
import {WEEKDAYS} from '~/types/dateTypes'
import type {WeekDayMap, WeekDay} from '~/types/dateTypes'
import {DinnerMode} from '@prisma/client'
import {z} from 'zod'

interface Props {
  modelValue?: WeekDayMap<DinnerMode> | null
  compact?: boolean
  disabled?: boolean
  label?: string
  name?: string
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
  disabled: false,
  label: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: WeekDayMap<DinnerMode>]
}>()

const {createDefaultWeekdayMap} = useWeekDayMapValidation({
  valueSchema: z.nativeEnum(DinnerMode),
  defaultValue: DinnerMode.NONE
})

// Dinner mode display config
const dinnerModeConfig = {
  [DinnerMode.DINEIN]: {label: 'Fællesspisning', icon: 'i-streamline-food-kitchenware-spoon-plate-fork-plate-food-dine-cook-utensils-eat-restaurant-dining', color: 'success'},
  [DinnerMode.TAKEAWAY]: {label: 'Takeaway', icon: 'i-heroicons-shopping-bag', color: 'primary'},
  [DinnerMode.NONE]: {label: 'Ingen fællesmad', icon: 'i-heroicons-x-circle', color: 'neutral'}
}

// Radio group options
const dinnerModeOptions = [
  {label: dinnerModeConfig[DinnerMode.DINEIN].label, value: DinnerMode.DINEIN},
  {label: dinnerModeConfig[DinnerMode.TAKEAWAY].label, value: DinnerMode.TAKEAWAY},
  {label: dinnerModeConfig[DinnerMode.NONE].label, value: DinnerMode.NONE}
]

// Format day for compact display (first 3 letters)
const formatDayCompact = (day: WeekDay) => {
  return day.substring(0, 3)
}

// Update local model value
const updateDay = (day: WeekDay, value: DinnerMode) => {
  if (props.disabled) return

  // Initialize with all days set to NONE if modelValue is null/undefined
  const updated: WeekDayMap<DinnerMode> = props.modelValue
    ? {...props.modelValue}
    : createDefaultWeekdayMap(DinnerMode.NONE)

  updated[day] = value
  emit('update:modelValue', updated)
}
</script>

<template>
  <!-- COMPACT VIEW: Show icons for each day -->
  <div v-if="compact" class="flex gap-1">
    <div v-for="day in WEEKDAYS" :key="day" class="w-12 flex justify-center">
      <UTooltip :text="dinnerModeConfig[modelValue?.[day] ?? DinnerMode.NONE].label">
        <UIcon
          :name="dinnerModeConfig[modelValue?.[day] ?? DinnerMode.NONE].icon"
          class="w-5 h-5"
          :class="{
            'text-green-600': modelValue?.[day] === DinnerMode.DINEIN,
            'text-blue-600': modelValue?.[day] === DinnerMode.TAKEAWAY,
            'text-gray-400': modelValue?.[day] === DinnerMode.NONE || !modelValue?.[day]
          }"
        />
      </UTooltip>
    </div>
  </div>

  <!-- FULL VIEW: Show radio buttons for each day -->
  <UFormField v-else :label="label" :name="name">
    <div class="flex flex-col gap-2">
      <div v-for="day in WEEKDAYS" :key="day" class="flex items-center gap-4">
        <span class="text-sm font-medium capitalize w-20">{{ day }}</span>
        <URadioGroup
          :model-value="modelValue?.[day] ?? DinnerMode.NONE"
          :items="dinnerModeOptions"
          :disabled="disabled"
          :name="`${name}-${day}`"
          orientation="horizontal"
          @update:model-value="(value) => updateDay(day, value)"
        />
      </div>
    </div>
  </UFormField>
</template>