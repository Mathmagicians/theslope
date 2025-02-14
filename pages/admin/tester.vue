<script setup lang="ts">

import {capitalize} from "vue"
import { type Ref, inject } from 'vue'
import type {Duration} from "date-fns";

const ranges = [
  {label: 'Sidste uge', duration: {days: 7}},
  {label: 'Sidste 14 dage', duration: {days: 14}},
]

const startDate = new Date(2024, 7, 1)
const endDate = new Date(2025, 5, 31)

interface DateRange {
  start: Date
  end: Date
}

const selectedDates = ref<DateRange[]>([])
const selected = ref<DateRange>({start: new Date(), end: new Date()})

const weekdays = ref(createDefaultWeekdayMap(false))

const handleClose = () => {
  selectedDates.value.push(selected.value)
}
function checkRangeSelected(duration: Duration) {
  return isRangeSelected(selected.value.start, selected.value.end, duration)
}

function selectRange(duration: Duration) {
  selected.value = createDateRange(duration)
}

const dinnerDays = ref(getEachDayOfIntervalWithSelectedWeekdays(startDate, endDate, weekdays.value))
const allHolidays = computed(() => eachDayOfManyIntervals(selectedDates.value))
const resultDays = computed(() => excludeDatesFromInterval(dinnerDays.value, selectedDates.value))

watch(weekdays, (selectedDays: WeekDayMap) => {
  dinnerDays.value = getEachDayOfIntervalWithSelectedWeekdays(startDate, endDate, selectedDays)
  console.log("DinnerDays:", dinnerDays.value.length)
  console.log('selectedDates:', selectedDates.value)
  console.log('resultDays:', resultDays?.value?.length) ?? 0
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
const getIsMd = computed(():boolean =>  isMd?.value ?? false)
watch(isMd, (newValue) => {
  console.log('TESTER > isMd changed:', newValue);
})
</script>

<template>
  <div>
    <h2>Calendar fra nuxt module</h2>
    <client-only>
      {{ 'IS MD: ' + getIsMd }}
      <!-- isMd is a ref, that should be provided by layout -->
      <VCalendar show-iso-weeknumbers :expanded="!isMd"
                 :attributes="attrs" :min-date="startDate" :max-date="endDate"/>
    </client-only>

    <UDivider/>
    <h2>Calendar fra egen komponent DateRangePicker</h2>
    <UPopover :popper="{ placement: 'bottom-start' }" color="white dark:purple">
      <UButton icon="i-heroicons-calendar-days-20-solid" color="pink">
        Vælg periode
      </UButton>
      <UBadge> {{ formatDateRange(selected.start, selected.end)  }} </UBadge>


      <template #panel="{ close }">
        <div class="flex items-center sm:divide-x divide-gray-200 dark:divide-gray-800">
          <div class="hidden sm:flex flex-col py-4">
            <UButton
                v-for="(range, index) in ranges"
                :key="index"
                :label="range.label"
                color="purple"
                size="lg"
                variant="ghost"
                class="rounded-none px-6"
                :class="[checkRangeSelected(range.duration) ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50']"
                truncate
                @click="selectRange(range.duration)"
            />
          </div>

          <DateRangePicker v-model="selected" @close="handleClose()"/>
        </div>
      </template>
    </UPopover>
    <ul>
      <li v-for="(dates, index) in selectedDates" :key="index">
        <div>
          <UBadge> {{ formatDateRange(dates.start, dates.end)  }}</UBadge>
          <UButton @click="selectedDates.splice(index, 1)" color="red" icon="i-heroicons-trash" variant="ghost"/>
        </div>
      </li>
    </ul>
    <UDivider/>
    <UCard>
      <template #header>
        <h3 class="text-lg font-medium">Hvilke ugedage skal der være fællesspisning?</h3>
      </template>
      <template #default>
        <div class="flex flex-col md:flex-row md:space-x-4 space-y-2 md:space-y-0">
          <UCheckbox
              v-for="day in WEEKDAYS"
              :key="day"
              v-model="weekdays[day]"
              :label="capitalize(day)"
          />
        </div>
      </template>
    </UCard>
    <UDivider/>
    <h2>
      AdminPlanning
    </h2>
    <AdminPlanning/>

  </div>


</template>
