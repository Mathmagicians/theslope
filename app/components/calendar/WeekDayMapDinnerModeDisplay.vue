<script setup lang="ts">
/**
 * WeekDayMapDinnerModeDisplay - Display and edit DinnerMode preferences for each weekday
 *
 * Used in HouseholdCard expandable table rows
 *
 * Now uses DinnerModeSelector (the atomic DRY component) for each weekday.
 * This component is just a loop wrapper - all display logic is in DinnerModeSelector.
 *
 * VIEW MODE (collapsed row):
 * ┌────────────────────────────────────┐
 * │ Mon Tue Wed Thu Fri                │
 * │ 🍽️  🍽️  🍽️  🍽️  🛍️              │
 * └────────────────────────────────────┘
 * - Compact badges
 * - Colors: success (eating), error (none)
 * - Read-only (no interaction)
 *
 * EDIT MODE (expanded row):
 * ┌────────────────────────────────────────────────────────────────┐
 * │ Mon: [🍽️ Spis][🕐 Sen][🛍️ Takeaway][❌ Ingen]              │
 * │      ^^^^^^^^^ ^^^^^^^^ ^^^^^^^^^^^^ ^^^^^^^^^^^^              │
 * │      active   inactive  inactive     inactive                 │
 * │      solid    ghost     ghost        ghost                    │
 * │      success  neutral   neutral      neutral                  │
 * │                                                                │
 * │ Tue: [🍽️ Spis][🕐 Sen][🛍️ Takeaway][❌ Ingen]              │
 * │ Wed: [🍽️ Spis][🕐 Sen][🛍️ Takeaway][❌ Ingen]              │
 * │ Thu: [🍽️ Spis][🕐 Sen][🛍️ Takeaway][❌ Ingen]              │
 * │ Fri: [🍽️ Spis][🕐 Sen][🛍️ Takeaway][❌ Ingen]              │
 * └────────────────────────────────────────────────────────────────┘
 *
 */
import {WEEKDAYS} from '~/types/dateTypes'
import type {WeekDayMap, WeekDay} from '~/types/dateTypes'
import type {DinnerMode} from '~/composables/useDinnerEventValidation'
import {FORM_MODES, type FormMode} from '~/types/form'

interface Props {
  modelValue?: WeekDayMap<DinnerMode> | null
  formMode?: FormMode
  disabled?: boolean
  name?: string
  parentRestriction?: WeekDayMap | null // Filter which weekdays to display (e.g., season cooking days)
  showLabels?: boolean // Whether to show weekday labels (default true for standalone, false for table)
}

const props = withDefaults(defineProps<Props>(), {
  formMode: FORM_MODES.VIEW,
  disabled: false,
  parentRestriction: null,
  showLabels: true
})

const emit = defineEmits<{
  'update:modelValue': [value: WeekDayMap<DinnerMode>]
}>()

// Design system
const { ORIENTATIONS, WEEKDAY } = useTheSlopeDesignSystem()

const {DinnerModeSchema} = useDinnerEventValidation()
const DinnerMode = DinnerModeSchema.enum

const {createDefaultWeekdayMap} = useWeekDayMapValidation({
  valueSchema: DinnerModeSchema,
  defaultValue: DinnerMode.DINEIN
})

// Update single day
const updateDay = (day: WeekDay, value: DinnerMode) => {
  if (props.disabled || props.formMode === FORM_MODES.VIEW) return

  // Initialize with all days set to DINEIN if modelValue is null/undefined
  const updated: WeekDayMap<DinnerMode> = props.modelValue
    ? {...props.modelValue}
    : createDefaultWeekdayMap(DinnerMode.DINEIN)

  updated[day] = value
  emit('update:modelValue', updated)
}

// Filter weekdays based on parent restriction (e.g., season cooking days)
const visibleDays = computed(() => {
  if (!props.parentRestriction) return WEEKDAYS
  return WEEKDAYS.filter(day => props.parentRestriction![day])
})

// Get dinner mode for a specific day
const getDayValue = (day: WeekDay): DinnerMode => {
  return props.modelValue?.[day] ?? DinnerMode.DINEIN
}
</script>

<template>
  <!-- VIEW MODE: Horizontal compact display with badges - filtered weekdays only -->
  <UFieldGroup
    v-if="formMode === FORM_MODES.VIEW"
    :name="name"
    :data-testid="name"
    size="sm"
    orientation="horizontal"
    :class="WEEKDAY.fieldGroupClasses"
  >
    <DinnerModeSelector
      v-for="day in visibleDays"
      :key="day"
      :model-value="getDayValue(day)"
      :form-mode="formMode"
      :disabled="disabled"
      size="sm"
      :name="`${name}-${day}`"
    />
  </UFieldGroup>

  <!-- EDIT MODE: Responsive button groups (vertical on mobile, horizontal on desktop) -->
  <div v-else-if="formMode === FORM_MODES.EDIT" class="flex gap-2 md:gap-4 flex-wrap ">
    <div v-for="day in visibleDays" :key="day" class="flex flex-col items-center gap-2">
      <!-- Weekday label (if enabled) -->
      <DinnerModeSelector
        v-if="showLabels"
        :model-value="day"
        size="sm"
        :name="`${name}-${day}-label`"
      />

      <!-- Dinner mode selector (with responsive orientation inside) -->
      <DinnerModeSelector
        :model-value="getDayValue(day)"
        :form-mode="formMode"
        :disabled="disabled"
        size="sm"
        :name="`${name}-${day}`"
        @update:model-value="(value) => updateDay(day, value as DinnerMode)"
      />
    </div>
  </div>
</template>
