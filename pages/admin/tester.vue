<script setup lang="ts">
import {type DateRange, WEEKDAYS} from "~/types/dateTypes"
import {capitalize} from "vue"
import { type Ref, inject } from 'vue'
//import type {Duration} from "date-fns";

const startDate = new Date(2024, 7, 1)
const endDate = new Date(2025, 5, 31)

const selectedDates = ref<DateRange[]>([])

//v-model for the date picker
const selected = ref<DateRange>({start: new Date(), end: new Date()})

const weekdays = ref(createDefaultWeekdayMap(false))

const handleClose = () => {
  selectedDates.value.push(selected.value)
}

const dinnerDays = ref(getEachDayOfIntervalWithSelectedWeekdays(startDate, endDate, weekdays.value))
const allHolidays = computed(() => eachDayOfManyIntervals(selectedDates.value))
const resultDays = computed(() => excludeDatesFromInterval(dinnerDays.value, selectedDates.value))

watch(weekdays, (selectedDays: WeekDayMap) => {
  dinnerDays.value = getEachDayOfIntervalWithSelectedWeekdays(startDate, endDate, selectedDays)
  console.log("DinnerDays:", dinnerDays.value.length)
  console.log('selectedDates:', selectedDates.value)
  console.log('resultDays:', resultDays?.length ?? 0)
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
      <UBadge> {{ formatDateRange(selected)  }} </UBadge>


      <template #panel="{ close }">
        <div class="flex items-center sm:divide-x divide-gray-200 dark:divide-gray-800">
          <CalendarDateRangePicker v-model="selected" @close="handleClose()"/>
        </div>
      </template>
    </UPopover>
    <ul>
      <li v-for="(dates, index) in selectedDates" :key="index">
        <div>
          <UBadge> {{ formatDateRange(dates)  }}</UBadge>
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
