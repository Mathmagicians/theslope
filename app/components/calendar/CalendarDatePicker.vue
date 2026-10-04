<script setup lang="ts">
import {isCalendarDateInDateList} from "~/utils/date"
import type {DateValue} from '@internationalized/date'
import {applyValidation, getErrorMessage} from "~/utils/validtation"

// COMPONENT DEFINITIONS
const model = defineModel<Date | null>({required: true})
const props = withDefaults(defineProps<{ label?: string, name?: string }>(), {
  label: 'Dato',
  name: undefined
})
const emit = defineEmits(['update:model-value'])

// DESIGN SYSTEM
const {COMPONENTS} = useTheSlopeDesignSystem()

// A single date is always a cooking-day pick (CALENDAR.picker); the slot draws it
const isDaySelected = (day: DateValue) => isCalendarDateInDateList(day, model.value ? [model.value] : [])

// STATE
const errors = ref<Map<string, string[]>>(new Map())

// COMPUTED STATE
// One model: the typed segments and the calendar read and write the same CalendarDate
const pickerDate = computed<DateValue | undefined>({
  get: () => model.value ? toCalendarDate(model.value) : undefined,
  set: (value) => {
    updateDate(value ? toDate(value) : null)
  }
})

// ACTIONS
const updateDate = (newDate: Date | null) => {
  if (newDate === null) {
    model.value = null
    emit('update:model-value', null)
    errors.value.clear()
    return true
  }

  const validated = applyValidation(dateSchema, newDate, errors)
  if (validated === undefined) return false
  model.value = validated
  emit('update:model-value', validated)
  return true
}

// Expose for testing
defineExpose({
  errors,
  updateDate
})

</script>

<template>
  <UFormField
    class="p-2"
    :label="props.label"
    :error="getErrorMessage(errors, ['_', 'date'])">
    <UInputDate
      v-bind="COMPONENTS.dateField"
      v-model="pickerDate"
      :name="props.name"
    >
      <template #trailing>
        <CalendarPickerPopover v-model="pickerDate" :is-day-selected="isDaySelected" />
      </template>
    </UInputDate>
  </UFormField>
</template>
