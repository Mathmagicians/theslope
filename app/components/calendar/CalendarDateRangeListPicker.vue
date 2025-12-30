<script setup lang="ts">
import type {DateRange} from "~/types/dateTypes"
import {createDateRange, formatDateRange} from "~/utils/date"
import {mapZodErrorsToFormErrors} from "~/utils/validtation"

// COMPONENT DEPENDENCIES
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
const onAddHolidayRange = () => {
  if (addedRange.value.start && addedRange.value.end) {
    const newHoliday = createDateRange(addedRange.value.start, addedRange.value.end)
    const newHolidays = [...model.value, newHoliday]
    const validation = holidaysSchema.safeParse(newHolidays)
    if (validation.success) {
      model.value = newHolidays
      addedRange.value = createDateRange(defaultDate.value, defaultDate.value)
      errors.value.clear()
    } else {
      const errorMap = mapZodErrorsToFormErrors(validation.error)
      errors.value.clear()
      errorMap.forEach((value, key) => {
        errors.value.set(key, value)
      })
    }
  }
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
            name="holidayRangeList"/>

      </UFormField>
      <UButton
          :class="errors.size ? 'md:mb-8' : 'md:mb-1' "
          data-testid="holiday-range-add"
          color="info"
          size="lg"
          icon="i-heroicons-sun"
          variant="outline"
          @click="onAddHolidayRange">
        Tilføj ferie
      </UButton>
    </div>

    <!-- List of holidays -->
    <ul v-if="model?.length > 0" class="mt-4 space-y-2">
      <li
          v-for="(dates, index) in model"
          :id="`holidayRangeList-${index}`"
          :key="`holiday-${index}-${dates ? dates.start?.getTime() : 'empty'}`">
        <UFormField :label="index === 0 ?  'Valgte ferieperioder' : '' ">
          <div class="flex items-center gap-2">
            <UInput
                :model-value="formatDateRange(dates)"
                :name="`holidayRangeList-${index}`"
                disabled
                placeholder="Ferieperiode"
                :ui="{ base: 'w-fit min-w-full mr-4' }"
            >
            <template #leading>
              <UIcon name="i-heroicons-sun"/>
            </template>
            </UInput>
            <UButton
                v-if="!props.disabled"
                :name="`holidayRangeRemoveFromList-${index}`"
                color="error"
                icon="i-heroicons-trash"
                size="sm"
                variant="ghost"
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
