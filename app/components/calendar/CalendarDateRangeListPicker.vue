<!--
Holiday list. The rows are drawn in AdminPlanningSeason.vue's mockup.

Edit and create render every row as a CalendarDateRangePicker (selection="holiday") and
validate the whole list on each change; view renders the rows read-only.

Visual check: /admin/planning in view and edit, the holidays and the empty line, phone and desktop.
-->

<script setup lang="ts">
import type {DateRange} from "~/types/dateTypes"
import {createDateRange, formatDateRange, sortDateRanges} from "~/utils/date"
import {mapZodErrorsToFormErrors} from "~/utils/validtation"
import type {CalendarPickerSelection} from "~/composables/useTheSlopeDesignSystem"
import {DATE_WORDS} from '~/config/dateWords'

const {BUTTONS, COLOR, ICONS, COMPONENTS} = useTheSlopeDesignSystem()
const HOLIDAYS = DATE_WORDS.picker.holidays
const {holidaysSchema} = useSeasonValidation()

const model = defineModel<DateRange[]>({required: true, default: () => []})
const props = withDefaults(defineProps<{
  disabled?: boolean,
  seasonDates?: DateRange
}>(), {
  disabled: false,
  seasonDates: undefined
})

// A holiday list picks holidays, so every picker here reads as the holiday marker
const SELECTION: CalendarPickerSelection = 'holiday'
const ADD_ROW_NAME = 'holidayRangeList'
const rowName = (index: number) => `${ADD_ROW_NAME}-${index}`

const errors = ref<Map<string, string[]>>(new Map())

// Without season dates the picker starts on the day of the first render; a fallback that followed the clock would reset the draft every minute
const today = useClock().value
const defaultDate = computed(() => props.seasonDates?.start ?? today)

const addedRange = ref<DateRange>(createDateRange(defaultDate.value, defaultDate.value))

watch(defaultDate, (newDate) => {
  addedRange.value = createDateRange(newDate, newDate)
})

/**
 * Validate the whole list (overlap, inside season) before it reaches the model.
 * Returns whether the list was accepted.
 */
const commitHolidays = (newHolidays: DateRange[]): boolean => {
  const validation = holidaysSchema.safeParse(newHolidays)
  errors.value.clear()
  if (validation.success) {
    model.value = newHolidays
    return true
  }
  mapZodErrorsToFormErrors(validation.error).forEach((value, key) => {
    errors.value.set(key, value)
  })
  return false
}

const onAddHolidayRange = () => {
  if (addedRange.value.start && addedRange.value.end) {
    const newHoliday = createDateRange(addedRange.value.start, addedRange.value.end)
    if (commitHolidays(sortDateRanges([...model.value, newHoliday]))) {
      addedRange.value = createDateRange(defaultDate.value, defaultDate.value)
    }
  }
}

// Row edits replace in place - canonical chronological order is restored on save (serializeSeason)
const onUpdateHoliday = (index: number, range: DateRange) => {
  commitHolidays(model.value.map((holiday, i) =>
      i === index ? createDateRange(range.start, range.end) : holiday
  ))
}

const onRemoveHoliday = (index: number) => {
  model.value = model.value.filter((_, i) => i !== index)
}

</script>

<template>
  <div>
    <div v-if="!props.disabled" :class="COMPONENTS.holidayListPicker.addRow">
      <UFormField
          name="holidayPicker"
          :error="errors.get('_')?.[0] || errors.get('holidays')?.[0] || ''">
        <CalendarDateRangePicker
            v-model="addedRange"
            :name="ADD_ROW_NAME"
            :selection="SELECTION"/>

      </UFormField>
      <UButton
          v-bind="BUTTONS.secondaryAction"
          :class="errors.size ? COMPONENTS.holidayListPicker.addButton.withError : COMPONENTS.holidayListPicker.addButton.plain"
          data-testid="holiday-range-add"
          :color="COLOR.info"
          :icon="ICONS.holiday"
          @click="onAddHolidayRange">
        {{ HOLIDAYS.add }}
      </UButton>
    </div>

    <ul v-if="model?.length > 0" :class="COMPONENTS.seasonFormList.list">
      <li
          v-for="(dates, index) in model"
          :key="`holiday-${index}`"
          :data-testid="rowName(index)">
        <UFormField :label="index === 0 ? HOLIDAYS.chosen : ''">
          <div :class="COMPONENTS.holidayListPicker.row">
            <CalendarDateRangePicker
                :model-value="dates"
                :name="rowName(index)"
                :selection="SELECTION"
                :disabled="props.disabled"
                :icon="ICONS.holiday"
                label=""
                @update:model-value="onUpdateHoliday(index, $event)"/>
            <UButton
                v-if="!props.disabled"
                v-bind="BUTTONS.remove"
                :data-testid="`holiday-range-remove-${index}`"
                :aria-label="HOLIDAYS.remove(formatDateRange(dates))"
                @click="onRemoveHoliday(index)"/>
          </div>
        </UFormField>
      </li>
    </ul>
    <h3 v-else :class="COMPONENTS.seasonFormList.empty">Fællesspisning sæsonen har ingen ferier.</h3>
  </div>
</template>
