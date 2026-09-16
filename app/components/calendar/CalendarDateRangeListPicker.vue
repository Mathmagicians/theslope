<!--
Holiday list. The rows are drawn in AdminPlanningSeason.vue's mockup.

Edit and create render every row as a CalendarDateRangePicker (selection="holiday") and
validate the whole list on each change; view renders the rows read-only.
-->

<script setup lang="ts">
import type {DateRange} from "~/types/dateTypes"
import {createDateRange, formatDateRange, sortDateRanges} from "~/utils/date"
import {mapZodErrorsToFormErrors} from "~/utils/validtation"

import type {CalendarPickerSelection} from "~/composables/useTheSlopeDesignSystem"

// COMPONENT DEPENDENCIES
const {BUTTONS, COLOR, ICONS} = useTheSlopeDesignSystem()
const {holidaysSchema} = useSeasonValidation()

// COMPONENT DEFINITION

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

// STATE
const errors = ref<Map<string, string[]>>(new Map())

// COMPUTED
const defaultDate = computed(() => props.seasonDates?.start ?? new Date())

//  STATE & INITIALIZATION
const addedRange = ref<DateRange>(createDateRange(defaultDate.value, defaultDate.value))

// WATCHERS
// Update addedRange when season dates change
watch(defaultDate, (newDate) => {
  addedRange.value = createDateRange(newDate, newDate)
})

// ACTIONS
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

</script>

<template>
  <div>
    <!-- Calendar Date Range Picker with validation -->
    <div
        v-if="!props.disabled"
        class="flex flex-col md:flex-row items-center md:items-end  space-x-2 md:space-x-4">
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
          :class="errors.size ? 'md:mb-8' : 'md:mb-1' "
          data-testid="holiday-range-add"
          :color="COLOR.info"
          :icon="ICONS.holiday"
          @click="onAddHolidayRange">
        Tilføj ferie
      </UButton>
    </div>

    <!-- List of holidays -->
    <ul v-if="model?.length > 0" class="mt-4 space-y-2">
      <li
          v-for="(dates, index) in model"
          :key="`holiday-${index}`"
          :data-testid="rowName(index)">
        <UFormField :label="index === 0 ?  'Valgte ferieperioder' : '' ">
          <div class="flex items-center gap-2">
            <UIcon v-if="!props.disabled" :name="ICONS.holiday"/>
            <CalendarDateRangePicker
                v-if="!props.disabled"
                :model-value="dates"
                :name="rowName(index)"
                :selection="SELECTION"
                @update:model-value="onUpdateHoliday(index, $event)"/>
            <UInput
                v-else
                :model-value="formatDateRange(dates)"
                :name="rowName(index)"
                disabled
                placeholder="Ferieperiode"
                :ui="{ base: 'w-fit min-w-full mr-4' }"
            >
            <template #leading>
              <UIcon :name="ICONS.holiday"/>
            </template>
            </UInput>
            <UButton
                v-if="!props.disabled"
                v-bind="BUTTONS.edit"
                :data-testid="`holiday-range-remove-${index}`"
                :icon="ICONS.trash"
                :aria-label="`Fjern ferieperiode ${formatDateRange(dates)}`"
                @click="model.splice(index, 1)"/>
          </div>
        </UFormField>
      </li>
    </ul>
    <h3
v-else
        class="text-md mx-auto">Fællesspisning sæsonen har ingen ferier.</h3>
  </div>
</template>
