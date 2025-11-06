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
  parentRestriction?: WeekDayMap | null // Filter which weekdays to display (e.g., season cooking days)
  showLabels?: boolean // Whether to show weekday labels (default true for standalone, false for table)
}

const props = withDefaults(defineProps<Props>(), {
  formMode: FORM_MODES.VIEW,
  disabled: false,
  label: '',
  parentRestriction: null,
  showLabels: true
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
  [DinnerMode.TAKEAWAY]: {label: 'Takeaway', icon: 'i-heroicons-shopping-bag', color: 'success'},
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

// Filter weekdays based on parent restriction (e.g., season cooking days)
const visibleDays = computed(() => {
  if (!props.parentRestriction) return WEEKDAYS
  return WEEKDAYS.filter(day => props.parentRestriction![day])
})
</script>

<template>
  <!-- VIEW MODE: Horizontal compact display with badges - filtered weekdays only -->
  <div v-if="formMode === FORM_MODES.VIEW" class="flex gap-1">
    <div v-for="day in visibleDays" :key="day" class="flex flex-col items-center gap-1 min-w-[32px]">
      <span v-if="showLabels" class="text-xs text-gray-500 capitalize">{{ formatWeekdayCompact(day) }}</span>
      <UBadge
        :color="getModeColor(modelValue?.[day] ?? DinnerMode.DINEIN)"
        variant="solid"
        size="xs"
      >
        <UIcon
          :name="getModeIcon(modelValue?.[day] ?? DinnerMode.DINEIN)"
          class="w-4 h-4"
        />
      </UBadge>
    </div>
  </div>

  <!-- EDIT MODE: Horizontal display with button groups - filtered weekdays only -->
  <div v-else-if="formMode === FORM_MODES.EDIT" class="flex gap-2 flex-wrap">
    <div v-for="day in visibleDays" :key="day" class="flex flex-col items-center gap-1">
      <span v-if="showLabels" class="text-xs text-gray-600 capitalize">{{ formatWeekdayCompact(day) }}</span>
      <UFieldGroup size="xs" orientation="horizontal">
        <UButton
          icon="i-streamline:food-kitchenware-spoon-plate-fork-plate-food-dine-cook-utensils-eat-restaurant-dining"
          :color="(modelValue?.[day] ?? DinnerMode.DINEIN) === DinnerMode.DINEIN ? 'success' : 'neutral'"
          :variant="(modelValue?.[day] ?? DinnerMode.DINEIN) === DinnerMode.DINEIN ? 'solid' : 'ghost'"
          :disabled="disabled"
          size="xs"
          :name="`${name}-${day}-DINEIN`"
          @click="updateDay(day, DinnerMode.DINEIN)"
        />
        <UButton
          icon="i-heroicons-shopping-bag"
          :color="(modelValue?.[day] ?? DinnerMode.DINEIN) === DinnerMode.TAKEAWAY ? 'primary' : 'neutral'"
          :variant="(modelValue?.[day] ?? DinnerMode.DINEIN) === DinnerMode.TAKEAWAY ? 'solid' : 'ghost'"
          :disabled="disabled"
          size="xs"
          :name="`${name}-${day}-TAKEAWAY`"
          @click="updateDay(day, DinnerMode.TAKEAWAY)"
        />
        <UButton
          icon="i-heroicons-x-circle"
          color="neutral"
          :variant="(modelValue?.[day] ?? DinnerMode.DINEIN) === DinnerMode.NONE ? 'solid' : 'ghost'"
          :disabled="disabled"
          size="xs"
          :name="`${name}-${day}-NONE`"
          @click="updateDay(day, DinnerMode.NONE)"
        />
      </UFieldGroup>
    </div>
  </div>
</template>