<script setup lang="ts">
import type {DateRange} from "~/types/dateTypes"

// COMPONENT DEPENDENCIES

// COMPONENT DEFINITION
const props = withDefaults(defineProps<{ disabled: boolean }>(), {disabled: false})
const model = defineModel<DateRange[]>({required: true})

// STATE
const addedRange = ref<Partial<DateRange>>(createDateRange(undefined, undefined))

// ACTIONS
const onAddHolidayRange = () => {
  if(addedRange.value.start && addedRange.value.end) {
    model.value.push(createDateRange(addedRange.value.start, addedRange.value.end))
  }
}

</script>

<template>
<div>
  <CalendarDateRangePicker
      name="holidayRangeList"
      v-if="!props.disabled"
      v-model="addedRange"
      @close="onAddHolidayRange"/>
  <ul>
    <li
        v-for="(dates, index) in model"
        :name="`holidayRangeList-${index}`"
        :key="index">
      <div class="flex flex-row items-center">
        <UBadge> {{ formatDateRange(dates) }}</UBadge>
        <UButton v-if="!props.disabled"
                 @click="model.splice(index, 1)" color="red" icon="i-heroicons-trash"
                 variant="ghost"/>
      </div>
    </li>
  </ul>
</div>
</template>
