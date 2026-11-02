<script setup lang="ts">
/**
 * WeekDayMapDinnerModeDisplay - Display and edit DinnerMode preferences for each weekday
 *
 * Used in HouseholdCard expandable table rows
 *
 * Each weekday renders a DinnerModeSelector, which holds the display logic.
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
 * Visual check: /household/[shortname]/settings, the weekday preferences in view and edit, phone and desktop.
 */
import {WEEKDAYS} from '~/types/dateTypes'
import type {WeekDayMap, WeekDay} from '~/types/dateTypes'
import type {DinnerMode as DinnerModeValue} from '~/composables/useBookingValidation'
import {FORM_MODES, type FormMode} from '~/types/form'
import type {ButtonProps} from '@nuxt/ui'

type ButtonSize = ButtonProps['size']

interface Props {
  modelValue?: WeekDayMap<DinnerModeValue> | null
  formMode?: FormMode
  disabled?: boolean
  name?: string
  parentRestriction?: WeekDayMap | null // Filter which weekdays to display (e.g., season cooking days)
  showLabels?: boolean // Whether to show weekday labels (default true for standalone, false for table)
  consensus?: WeekDayMap<boolean> | null // Which days have consensus (power mode)
  size?: ButtonSize // Size passed through to DinnerModeSelector
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  formMode: FORM_MODES.VIEW,
  disabled: false,
  name: undefined,
  parentRestriction: null,
  showLabels: true,
  consensus: null,
  size: undefined // Falls back to DinnerModeSelector default
})

const emit = defineEmits<{
  'update:modelValue': [value: WeekDayMap<DinnerModeValue>]
}>()

const { WEEKDAY, ORIENTATIONS } = useTheSlopeDesignSystem()

const {DinnerModeSchema} = useBookingValidation()
const DinnerMode = DinnerModeSchema.enum

const {createDefaultWeekdayMap} = useWeekDayMapValidation({
  valueSchema: DinnerModeSchema,
  defaultValue: DinnerMode.DINEIN
})

const updateDay = (day: WeekDay, value: DinnerModeValue) => {
  if (props.disabled || props.formMode === FORM_MODES.VIEW) return

  const updated: WeekDayMap<DinnerModeValue> = props.modelValue
    ? {...props.modelValue}
    : createDefaultWeekdayMap(DinnerMode.DINEIN)

  updated[day] = value
  emit('update:modelValue', updated)
}

// Filter weekdays based on parent restriction (e.g., season cooking days)
const visibleDays = computed(() => {
  const restriction = props.parentRestriction
  return restriction ? WEEKDAYS.filter(day => restriction[day]) : WEEKDAYS
})

const getDayValue = (day: WeekDay): DinnerModeValue => {
  return props.modelValue?.[day] ?? DinnerMode.DINEIN
}

// Check if day has consensus (undefined if no consensus map = not power mode)
const getDayConsensus = (day: WeekDay): boolean | undefined => {
  return props.consensus?.[day]
}
</script>

<template>
  <!-- VIEW MODE: Horizontal compact display with badges - filtered weekdays only -->
  <UFieldGroup
    v-if="formMode === FORM_MODES.VIEW"
    :name="name"
    :data-testid="name"
    :size="size"
    :orientation="ORIENTATIONS.horizontal"
    :class="WEEKDAY.fieldGroupClasses"
  >
    <DinnerModeSelector
      v-for="day in visibleDays"
      :key="day"
      :model-value="getDayValue(day)"
      :form-mode="formMode"
      :disabled="disabled"
      :consensus="getDayConsensus(day)"
      :size="size"
      :name="`${name}-${day}`"
    />
  </UFieldGroup>

  <!-- EDIT MODE: Responsive button groups (vertical on mobile, horizontal on desktop) -->
  <div v-else-if="formMode === FORM_MODES.EDIT" :class="WEEKDAY.editRow">
    <div v-for="day in visibleDays" :key="day" :class="WEEKDAY.editDay">
      <!-- Weekday label (if enabled) -->
      <DinnerModeSelector
        v-if="showLabels"
        :model-value="day"
        :size="size"
        :name="`${name}-${day}-label`"
      />

      <!-- Dinner mode selector (with responsive orientation inside) -->
      <DinnerModeSelector
        :model-value="getDayValue(day)"
        :form-mode="formMode"
        :disabled="disabled"
        :consensus="getDayConsensus(day)"
        :size="size"
        :name="`${name}-${day}`"
        @update:model-value="(value) => updateDay(day, value)"
      />
    </div>
  </div>
</template>
