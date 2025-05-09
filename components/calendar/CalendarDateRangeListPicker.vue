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
  disabled: false
})

// STATE
const errors = ref<Map<string, string[]>>(new Map())

// COMPUTED
const defaultDate = computed(() => props.seasonDates?.start ?? new Date())

//  STATE & INITIALIZATION
const addedRange = ref<DateRange>(createDateRange(defaultDate.value, defaultDate.value))

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
      <UFormGroup
          name="holidayPicker"
          :error="errors.get('_')?.[0] || errors.get('holidays')?.[0] || ''">
        <CalendarDateRangePicker
            name="holidayRangeList"
            v-model="addedRange"/>

      </UFormGroup>
      <UButton
          :class="errors.size ? 'md:mb-8' : 'md:mb-1' "
          @click="onAddHolidayRange"
          name="holidayRangeAddToList"
          color="pink"
          size="lg"
          icon="i-heroicons-sun"
          variant="outline">
        Tilføj ferie
      </UButton>
    </div>

    <!-- List of holidays -->
    <ul v-if="model?.length > 0" class="mt-4 space-y-2">
      <li
          v-for="(dates, index) in model"
          :id="`holidayRangeList-${index}`"
          :key="`holiday-${index}-${dates ? dates.start?.getTime() : 'empty'}`">
        <UFormGroup :label="index === 0 ?  'Valgte ferieperioder' : '' ">
          <UInput
              :model-value="formatDateRange(dates)"
              :name="`holidayRangeList-${index}`"
              disabled
              placeholder="Ferieperiode"
              :ui="{ icon: { trailing: { pointer: '' } } }"
          >
          <template #trailing>
            <UButton
                v-if="!props.disabled"
                @click="model.splice(index, 1)"
                :name="`holidayRangeRemoveFromList-${index}`"
                color="red"
                icon="i-heroicons-trash"
                size="sm"
                variant="ghost">
            </UButton>
            <UIcon v-else name="i-heroicons-sun" class="flex-shrink-0 text-gray-400 dark:text-gray-500 h-5 w-5"/>
          </template>
          </UInput>
        </UFormGroup>
      </li>
    </ul>
    <h3 v-else
        class="text-md mx-auto">Fællesspisning sæsonen har ingen ferier.</h3>
  </div>
</template>
