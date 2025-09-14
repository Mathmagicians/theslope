<script setup lang="ts">
import {type DateRange, type WeekDayMap, WEEKDAYS} from "~/types/dateTypes"
import {capitalize} from "vue"
import {type Ref, inject} from 'vue'
//import type {Duration} from "date-fns";

const startDate = new Date(2025, 7, 1)
const endDate = new Date(2026, 5, 31)

const selectedDates = ref<DateRange[]>([
  { start: new Date(2025, 8, 20), end: new Date(2025, 8, 26) },
  { start: new Date(2025, 11, 24), end: new Date(2025, 11, 26) }, // Christmas 2024
  { start: new Date(2025, 0, 1), end: new Date(2025, 0, 1) },     // New Year 2025
  { start: new Date(2025, 3, 14), end: new Date(2025, 3, 21) }    // Easter break 2025
])

//v-model for the date picker
const selected = ref<DateRange>({start: new Date(), end: new Date()})

const weekdays = ref(createDefaultWeekdayMap(false))
weekdays.value.mandag = true // Enable Monday


const dinnerDays = ref(getEachDayOfIntervalWithSelectedWeekdays(startDate, endDate, weekdays.value))
const allHolidays = computed(() => eachDayOfManyIntervals(selectedDates.value))
const resultDays = computed(() => excludeDatesFromInterval(dinnerDays.value, selectedDates.value))

watch(weekdays, (selectedDays: WeekDayMap) => {
  dinnerDays.value = getEachDayOfIntervalWithSelectedWeekdays(startDate, endDate, selectedDays)
  console.log("DinnerDays:", dinnerDays.value.length)
  console.log('selectedDates:', selectedDates.value)
  console.log('resultDays:', resultDays.value.length ?? 0)
}, {immediate: true, deep: true})


const attrs = ref([
  {
    key: 'holidays',
    dot: 'green',
    dates: allHolidays
  },
  {
    key: 'dinners',
    highlight: {
      color: 'purple',
      fillMode: 'solid'
    },
    dates: resultDays
  }
])

const isMd = inject<Ref<boolean>>('isMd')
const getIsMd = computed((): boolean => isMd?.value ?? false)
</script>

<template>
  <div>
    <h2>CalendarDisplay Test</h2>
    <CalendarDisplay
      :season-dates="{ start: startDate, end: endDate }"
      :holidays="selectedDates"
      :cooking-days="weekdays"
    />
  </div>
</template>
