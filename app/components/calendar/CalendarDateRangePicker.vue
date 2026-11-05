<script setup lang="ts">
import type {DateRange} from "~/types/dateTypes"
import {eachDayOfManyIntervals, isCalendarDateInDateList} from "~/utils/date"
import type {DateValue} from '@internationalized/date'
import {applyValidation, getErrorMessage} from "~/utils/validtation"
import type {CalendarPickerSelection} from "~/composables/useTheSlopeDesignSystem"
import {DATE_WORDS} from '~/config/dateWords'

const model = defineModel<DateRange>({required: true})
const props = withDefaults(defineProps<{ name?: string, disabled?: boolean, selection?: CalendarPickerSelection, label?: string, icon?: string }>(), {
  name: undefined,
  disabled: false,
  selection: 'cookingDay',
  label: DATE_WORDS.picker.range,
  icon: undefined
})
const emit = defineEmits<{close: []}>()

const {SIZES, COMPONENTS} = useTheSlopeDesignSystem()

const selectedDays = computed(() => model.value?.start && model.value?.end
    ? eachDayOfManyIntervals([{start: model.value.start, end: model.value.end}])
    : [])
const isDaySelected = (day: DateValue) => isCalendarDateInDateList(day, selectedDays.value)

const errors = ref<Map<string, string[]>>(new Map())

// One model: the field's typed segments and the range calendar read and write the same range
const calendarRange = computed(() => {
  const start = toCalendarDate(model.value?.start)
  const end = toCalendarDate(model.value?.end)
  return start && end ? {start, end} : null
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

const updateDateRange = (newRange: DateRange) => {
  if (applyValidation(dateRangeSchema, newRange, errors) !== undefined) model.value = newRange
}

// The disabled face: a range reads as one compact field, the presentation every range shares
const viewInput = computed(() => ({
  modelValue: formatDateRange(model.value),
  name: props.name,
  icon: props.icon,
  disabled: true,
  ui: COMPONENTS.dateRangeField.viewUi
}))

</script>

<template>
  <!-- A host with its own UFormField passes label="": nested UFormFields recurse Nuxt UI's props forwarding -->
  <UFormField v-if="props.disabled && props.label" :class="COMPONENTS.datePickerField" :label="props.label">
    <UInput v-bind="viewInput" />
  </UFormField>
  <UInput v-else-if="props.disabled" v-bind="viewInput" />
  <div v-else :name="props.name">
    <UFormField
        :class="COMPONENTS.datePickerField"
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
