<script setup lang="ts">
import type { DateRange } from "~/types/dateTypes"

// Sample data for testing CalendarDateRangePicker
const selected = ref<DateRange>({
  start: new Date(2025, 8, 1),
  end: new Date(2025, 8, 15)
})

const selectedRanges = ref<DateRange[]>([])

const handleClose = () => {
  selectedRanges.value.push({ ...selected.value })
  console.log('New range added:', selected.value)
}

const removeRange = (index: number) => {
  selectedRanges.value.splice(index, 1)
}
</script>

<template>
  <div class="space-y-6">
    <h2>CalendarDateRangePicker Test</h2>

    <div>
      <h3>Selected Range:</h3>
      <p>{{ formatDateRange(selected) }}</p>
    </div>

    <CalendarDateRangePicker
      v-model="selected"
      @close="handleClose"
    />

    <div v-if="selectedRanges.length > 0">
      <h3>Collected Ranges:</h3>
      <ul class="space-y-2">
        <li v-for="(range, index) in selectedRanges" :key="index" class="flex items-center gap-2">
          <UBadge>{{ formatDateRange(range) }}</UBadge>
          <UButton @click="removeRange(index)" color="red" icon="i-heroicons-trash" variant="ghost" size="xs" />
        </li>
      </ul>
    </div>
  </div>
</template>
