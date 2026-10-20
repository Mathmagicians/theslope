<script setup lang="ts">
import type {DateRange} from "~/types/dateTypes"
import {eachDayOfManyIntervals, isCalendarDateInDateList} from "~/utils/date"
import type {DateValue} from '@internationalized/date'
import {applyValidation, getErrorMessage} from "~/utils/validtation"
import type {CalendarPickerSelection} from "~/composables/useTheSlopeDesignSystem"

// COMPONENT DEFINITIONS
const model = defineModel<DateRange>({required: true})
const props = withDefaults(defineProps<{ name?: string, disabled?: boolean, selection?: CalendarPickerSelection, label?: string, icon?: string }>(), {
  name: undefined,
  disabled: false,
  selection: 'cookingDay',
  label: 'Start dato - Slut dato',
  icon: undefined
})
const emit = defineEmits(['update:model-value', 'close'])

// DESIGN SYSTEM
const {SIZES, COMPONENTS} = useTheSlopeDesignSystem()

const selectedDays = computed(() => model.value?.start && model.value?.end
    ? eachDayOfManyIntervals([{start: model.value.start, end: model.value.end}])
    : [])
const isDaySelected = (day: DateValue) => isCalendarDateInDateList(day, selectedDays.value)

// STATE
const errors = ref<Map<string, string[]>>(new Map())

// COMPUTED STATE
// One model: the field's typed segments and the range calendar read and write the same range
const calendarRange = computed(() => {
  if (model.value?.start && model.value?.end) {
    return {
      start: toCalendarDate(model.value.start)!,
      end: toCalendarDate(model.value.end)!
    }
  }
  return null
})

const fieldRange = computed({
  get: () => calendarRange.value ?? undefined,
  set: (value) => {
    // The range commits once both ends hold a full date
    if (value?.start && value?.end) {
      updateDateRange({start: toDate(value.start), end: toDate(value.end)})
    }
  }
})

const pickerDateRange = computed({
  get: () => calendarRange.value,
  set: (value) => {
    if (value?.start && value?.end) {
      updateDateRange({start: toDate(value.start), end: toDate(value.end)})
      emit('close')
    }
  }
})

// ACTIONS
const updateDateRange = (newRange: DateRange) => {
  const validated = applyValidation(dateRangeSchema, newRange, errors)
  if (validated === undefined) return false
  model.value = newRange
  emit('update:model-value', newRange)
  return true
}

// The disabled face: a range reads as one compact field, the presentation every range shares
const viewInput = computed(() => ({
  modelValue: formatDateRange(model.value),
  name: props.name,
  icon: props.icon,
  disabled: true,
  ui: COMPONENTS.dateRangeField.viewUi
}))

// Expose for testing
defineExpose({
  errors,
  updateDateRange
})

</script>

<template>
  <!-- A host with its own UFormField passes label="": nested UFormFields recurse Nuxt UI's props forwarding -->
  <UFormField v-if="props.disabled && props.label" :class="COMPONENTS.dateRangeField.field" :label="props.label">
    <UInput v-bind="viewInput" />
  </UFormField>
  <UInput v-else-if="props.disabled" v-bind="viewInput" />
  <div v-else :name="props.name">
    <UFormField
        :class="COMPONENTS.dateRangeField.field"
        :name="props.name"
        :label="props.label"
        :error="getErrorMessage(errors, ['_', 'start', 'end'])">
      <UInputDate
          v-bind="COMPONENTS.dateField"
          v-model="fieldRange"
          range
          :icon="props.icon"
      >
        <template #trailing>
          <CalendarPickerPopover
              v-model="pickerDateRange"
              range
              :selection="props.selection"
              :number-of-months="SIZES.calendarMonths"
              :is-day-selected="isDaySelected"
          />
        </template>
      </UInputDate>
    </UFormField>
  </div>
</template>
