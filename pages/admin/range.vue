<script setup lang="ts">
import type {DateRange} from "~/types/dateTypes"

const selected = ref<DateRange>(createDateRange())

const handleClose = () => {
  console.log(`RANGE > closing calendar, selected date range is: ${formatDateRange(selected.value)}`)
}

console.log("RANGE > selected date range is:", formatDateRange(selected))
</script>

<template>
  <div>
    <CalendarDateInput v-model="selected" />
    <p>Value from CalendarDateInput component is: {{ formatDateRange(selected) }}</p>
    <UDivider />
 <!--   <CalendarDateRangePicker v-model="selected" @close="handleClose()"/> -->
  </div>
</template>
