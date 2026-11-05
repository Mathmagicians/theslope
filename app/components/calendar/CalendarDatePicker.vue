<script setup lang="ts">
/**
 * CalendarDatePicker - one date: the typed field and the calendar popover write the same model
 *
 * Visual check: /household/[shortname]/settings (the move-out date) and /admin/households (the new household's dates),
 * phone and desktop.
 */
import {isCalendarDateInDateList} from "~/utils/date"
import type {DateValue} from '@internationalized/date'
import {DATE_WORDS} from '~/config/dateWords'

const model = defineModel<Date | null>({required: true})
const props = withDefaults(defineProps<{ label?: string, name?: string }>(), {
  label: DATE_WORDS.picker.date,
  name: undefined
})

const {COMPONENTS} = useTheSlopeDesignSystem()

// A single date is always a cooking-day pick (CALENDAR.picker); the slot draws it
const isDaySelected = (day: DateValue) => isCalendarDateInDateList(day, model.value ? [model.value] : [])

// One model: the typed segments and the calendar read and write the same CalendarDate. Both hand over whole dates
// only, so the pick needs no validation of its own
const pickerDate = computed<DateValue | undefined>({
  get: () => model.value ? toCalendarDate(model.value) : undefined,
  set: (value) => {
    model.value = value ? toDate(value) : null
  }
})

</script>

<template>
  <UFormField :class="COMPONENTS.datePickerField" :label="props.label">
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
