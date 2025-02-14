<script setup lang="ts">

import {sub, format, isSameDay, eachDayOfInterval, type Duration, getISODay} from 'date-fns'
import {capitalize} from "vue"
import { type Ref, inject } from 'vue'

const ranges = [
  {label: 'Sidste uge', duration: {days: 7}},
  {label: 'Sidste 14 dage', duration: {days: 14}},
]

const startDate = new Date(2024, 7, 1)
const endDate = new Date(2025, 5, 31)

const selected = ref({start: new Date(), end: new Date()})

const selectedDates = ref([])

function isRangeSelected(duration: Duration) {
  return isSameDay(selected.value.start, sub(new Date(), duration)) && isSameDay(selected.value.end, new Date())
}

function selectRange(duration: Duration) {
  selected.value = {start: sub(new Date(), duration), end: new Date()}
}


const WEEKDAYS = ['mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'loerdag', 'soendag'] as const;
type WeekDay = typeof WEEKDAYS[number];

type WeekDayMap = Record<WeekDay, boolean>;

const weekdays: WeekDayMap = ref({
  mandag: false,
  tirsdag: false,
  onsdag: false,
  torsdag: false,
  fredag: false,
  loerdag: false,
  soendag: false
})


const eachDayOfIntervalWithSelectedWeekdays = (
    start: Date,
    end: Date,
    selectedDays: WeekDayMap
) => {
  const selectedDayIndices = Object.entries(selectedDays)
      .flatMap(([day, isSelected]) => isSelected ? WEEKDAYS.indexOf(day) + 1 : [])

  return eachDayOfInterval({start, end})
      .filter(date => selectedDayIndices.includes(getISODay(date)))
}

const dinnerDays = ref(eachDayOfIntervalWithSelectedWeekdays(startDate, endDate, weekdays))



const handleClose = () => {
  selectedDates.value.push(selected.value)
}

const allHollidays = computed(() => {
  const arr = selectedDates.value.flatMap(range => eachDayOfInterval({start: range.start, end: range.end}))
  console.log("Arr:", arr)
  return arr
})

const resultDays = computed(() => {
  return dinnerDays.value.filter(date =>
      !allHollidays.value.some(holiday =>
          isSameDay(date, holiday)
      )
  )
})

watch(weekdays, (selectedDays: WeekDayMap) => {
  dinnerDays.value = eachDayOfIntervalWithSelectedWeekdays(startDate, endDate, selectedDays)
  console.log("DinnerDays:", dinnerDays.value.length)
}, {deep: true})


const attrs = ref([
  {
    key: 'holidays',
    dot: 'green',
    dates: []//selectedDates.value
  },
  {
    key: 'dinners',
    highlight: {
      color: 'purple',
      fillMode: 'solid'
    },
    dates: []//resultDays.value
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
      <UBadge> {{ format(selected.start, 'd MMM, yyy') }} - {{ format(selected.end, 'd MMM, yyy') }}</UBadge>


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
                :class="[isRangeSelected(range.duration) ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50']"
                truncate
                @click="selectRange(range.duration)"
            />
          </div>

          <DateRangePicker v-model="selected" @close="handleClose()"/>
        </div>
      </template>
    </UPopover>
    <ul>
      <li v-for="(date, index) in selectedDates" :key="date">
        <div>
          <UBadge> {{ format(date.start, 'd MMM, yyy') }} - {{ format(date.end, 'd MMM, yyy') }}</UBadge>
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
