<script setup lang="ts">
import type {DateRange} from "~/types/dateTypes"

const selected = ref<DateRange[]>([])


const handleClose = () => {
  console.log('RANGE > model updated, selected date ranges: ', selected.value)
}
</script>

<template>
  <div>
    <CalendarDateRangeListPicker :season-dates="createDateRange(new Date(2025,0,20), new Date(2025,4,25))"
                                 v-model="selected" debug @close="handleClose" @update:model-value="handleClose"/>
    <p>Value from CalendarDateInput component is: {{ selected }}</p>
    <UDivider />
 <!--   <CalendarDateRangePicker v-model="selected" @close="handleClose()"/> -->
  </div>
</template>
