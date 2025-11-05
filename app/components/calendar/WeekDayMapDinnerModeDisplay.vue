<script setup lang="ts">
/**
 * WeekDayMapDinnerModeDisplay - Display and edit DinnerMode preferences for each weekday
 *
 * Form modes:
 * - VIEW: Compact icons (read-only) - all screen sizes
 * - EDIT: Interactive controls
 *   - Mobile (< md): Single cycling button (saves space)
 *   - Desktop (md+): Button group with all 3 options visible
 */
import {WEEKDAYS} from '~/types/dateTypes'
import type {WeekDayMap, WeekDay} from '~/types/dateTypes'
import type {DinnerMode} from '~/composables/useDinnerEventValidation'
import {z} from 'zod'
import {FORM_MODES, type FormMode} from '~/types/form'
import {formatWeekdayCompact} from '~/utils/date'

interface Props {
  modelValue?: WeekDayMap<DinnerMode> | null
  formMode?: FormMode
  disabled?: boolean
  label?: string
  name?: string
}

const props = withDefaults(defineProps<Props>(), {
  formMode: FORM_MODES.VIEW,
  disabled: false,
  label: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: WeekDayMap<DinnerMode>]
}>()

const {DinnerModeSchema} = useDinnerEventValidation()

// Extract enum constants from Zod schema
const DinnerMode = DinnerModeSchema.enum

const {createDefaultWeekdayMap} = useWeekDayMapValidation({
  valueSchema: DinnerModeSchema,
  defaultValue: DinnerMode.DINEIN
})

// Dinner mode display config
const dinnerModeConfig: Record<DinnerMode, {label: string, icon: string, color: string}> = {
  [DinnerMode.DINEIN]: {label: 'Fællesspisning', icon: 'i-streamline-food-kitchenware-spoon-plate-fork-plate-food-dine-cook-utensils-eat-restaurant-dining', color: 'success'},
  [DinnerMode.TAKEAWAY]: {label: 'Takeaway', icon: 'i-heroicons-shopping-bag', color: 'primary'},
  [DinnerMode.NONE]: {label: 'Ingen fællesmad', icon: 'i-heroicons-x-circle', color: 'neutral'}
}

// Update local model value
const updateDay = (day: WeekDay, value: DinnerMode) => {
  if (props.disabled || props.formMode === FORM_MODES.VIEW) return

  // Initialize with all days set to DINEIN if modelValue is null/undefined
  const updated: WeekDayMap<DinnerMode> = props.modelValue
    ? {...props.modelValue}
    : createDefaultWeekdayMap(DinnerMode.DINEIN)

  updated[day] = value
  emit('update:modelValue', updated)
}

// Cycle through modes (for mobile single-button UI)
const cycleDayMode = (day: WeekDay) => {
  if (props.disabled || props.formMode === FORM_MODES.VIEW) return

  const current = props.modelValue?.[day] ?? DinnerMode.DINEIN
  const nextMode: Record<DinnerMode, DinnerMode> = {
    [DinnerMode.NONE]: DinnerMode.DINEIN,
    [DinnerMode.DINEIN]: DinnerMode.TAKEAWAY,
    [DinnerMode.TAKEAWAY]: DinnerMode.NONE
  }
  updateDay(day, nextMode[current])
}

// Get icon for a mode
const getModeIcon = (mode: DinnerMode): string => {
  return dinnerModeConfig[mode].icon
}

// Get color for a mode
const getModeColor = (mode: DinnerMode): string => {
  return dinnerModeConfig[mode].color
}
</script>

<template>
  <!-- VIEW MODE: Compact icons (read-only) -->
  <div v-if="formMode === FORM_MODES.VIEW" class="flex gap-0.5">
    <div v-for="day in WEEKDAYS" :key="day" class="flex flex-col items-center">
      <span class="text-[10px] text-gray-500 uppercase">{{ formatWeekdayCompact(day) }}</span>
      <UIcon
        :name="dinnerModeConfig[modelValue?.[day] ?? DinnerMode.DINEIN].icon"
        class="w-4 h-4"
        :class="{
          'text-green-600': modelValue?.[day] === DinnerMode.DINEIN,
          'text-blue-600': modelValue?.[day] === DinnerMode.TAKEAWAY,
          'text-gray-300': modelValue?.[day] === DinnerMode.NONE || !modelValue?.[day]
        }"
      />
    </div>
  </div>

  <!-- EDIT MODE: Interactive controls (responsive: cycling on mobile, button group on desktop) -->
  <div v-else-if="formMode === FORM_MODES.EDIT" class="flex flex-col gap-2">
    <div v-for="day in WEEKDAYS" :key="day" class="flex items-center gap-2">
      <span class="text-sm font-medium capitalize w-20">{{ day }}</span>

      <!-- Mobile: Single cycling button (< md) -->
      <UButton
        size="sm"
        class="md:hidden"
        :icon="getModeIcon(modelValue?.[day] ?? DinnerMode.DINEIN)"
        :color="getModeColor(modelValue?.[day] ?? DinnerMode.DINEIN)"
        :variant="(modelValue?.[day] ?? DinnerMode.DINEIN) === DinnerMode.NONE ? 'ghost' : 'soft'"
        :disabled="disabled"
        @click="cycleDayMode(day)"
      />

      <!-- Desktop: Button group (md+) -->
      <UFieldGroup size="sm" orientation="horizontal" class="hidden md:flex">
        <UButton
          icon="i-streamline:food-kitchenware-spoon-plate-fork-plate-food-dine-cook-utensils-eat-restaurant-dining"
          :color="(modelValue?.[day] ?? DinnerMode.DINEIN) === DinnerMode.DINEIN ? 'success' : 'neutral'"
          :variant="(modelValue?.[day] ?? DinnerMode.DINEIN) === DinnerMode.DINEIN ? 'solid' : 'ghost'"
          :disabled="disabled"
          @click="updateDay(day, DinnerMode.DINEIN)"
        />
        <UButton
          icon="i-heroicons-shopping-bag"
          :color="(modelValue?.[day] ?? DinnerMode.DINEIN) === DinnerMode.TAKEAWAY ? 'success' : 'neutral'"
          :variant="(modelValue?.[day] ?? DinnerMode.DINEIN) === DinnerMode.TAKEAWAY ? 'solid' : 'ghost'"
          :disabled="disabled"
          @click="updateDay(day, DinnerMode.TAKEAWAY)"
        />
        <UButton
          icon="i-heroicons-x-circle"
          color="neutral"
          :variant="(modelValue?.[day] ?? DinnerMode.DINEIN) === DinnerMode.NONE ? 'subtle' : 'ghost'"
          :disabled="disabled"
          @click="updateDay(day, DinnerMode.NONE)"
        />
      </UFieldGroup>
    </div>
  </div>
</template>