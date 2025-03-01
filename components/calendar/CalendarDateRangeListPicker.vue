<script setup lang="ts">
import type {DateRange} from "~/types/dateTypes"
import {getErrorMessage} from "~/utils/validtation"

// COMPONENT DEPENDENCIES
const {holidaysSchema} = useSeason()

// COMPONENT DEFINITION

const model = defineModel<DateRange[]>({required: true})
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
  <div  v-if="false">
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
          variant="outline">
        <template #leading>
          <UIcon name="i-heroicons-sun" />
        </template>
        Tilføj ferie
      </UButton>
    </div>

    <!-- List of holidays -->
    <ul v-if="model?.length > 0" class="mt-4 space-y-2">
      <li
          v-for="(dates, index) in model"
          :id="`holidayRangeList-${index}`"
          :key="index">
        <UFormGroup :label="index === 0 ?  'Valgte ferieperioder' : '' ">
          <UInput
              :model-value="formatDateRange(dates)"
              :name="`holidayRangeList-${index}`"
              disabled
              :ui="{
                icon: {
                  leading: { name: '' },
                  trailing: { name: '' }
                }
              }"
          >
          <template #trailing>
            <UButton
                v-if="!props.disabled"
                @click="model.splice(index, 1)"
                :name="`holidayRangeRemoveFromList-${index}`"
                color="red"
                size="sm"
                variant="ghost">
                <template #default>
                  <UIcon name="i-heroicons-trash" />
                </template>
            </UButton>
          </template>
          </UInput>
        </UFormGroup>
      </li>
    </ul>
  </div>
</template>
