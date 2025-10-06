<script setup lang="ts">
import type {DateRange, WeekDayMap} from '~/types/dateTypes'
import type {DateValue} from "@internationalized/date"
import {isCalendarDateInDateList, translateToDanish} from "~/utils/date"

interface Props {
  seasonDates: DateRange
  holidays: DateRange[]
  cookingDays: WeekDayMap
}

const props = defineProps<Props>()

const dinnerDays = computed(() => getEachDayOfIntervalWithSelectedWeekdays(
    props.seasonDates.start,
    props.seasonDates.end,
    props.cookingDays))

const allHolidays = computed(() => eachDayOfManyIntervals(props.holidays))

const resultDays = computed(() => excludeDatesFromInterval(
    dinnerDays.value,
    props.holidays))

const seasonDatesAsCalendarDates = computed(() => toCalendarDateRange(props.seasonDates))

const isHoliday = (day: DateValue): boolean => {
  return isCalendarDateInDateList(day, allHolidays.value)
}

const isCookingDay = (day: DateValue): boolean => {
  return isCalendarDateInDateList(day, resultDays.value)
}

const isMd = inject<Ref<boolean>>('isMd')
const getIsMd = computed((): boolean => isMd?.value ?? false)

</script>

<template>
  <UCalendar
    :size="getIsMd ? 'xl': 'sm'"
    :number-of-months="getIsMd ? 3: 1"
    :min-value="seasonDatesAsCalendarDates.start"
    :max-value="seasonDatesAsCalendarDates.end"
    :week-starts-on="1"
    :fixed-weeks="false"
    weekday-format="short"
  >
    <template #day="{ day }">
      <UChip v-if="isHoliday(day)" show size="md" color="success">
        {{ day.day }}
      </UChip>
      <div v-else-if="isCookingDay(day)" class="w-8 h-8 bg-pink-800 text-pink-50 rounded-full flex items-center justify-center text-sm font-medium">
        {{ day.day }}
      </div>
    </template>
    <template #week-day="{ day}">
      <span class="text-sm text-muted uppercase">
        {{ translateToDanish(day) }}
      </span>
    </template>
  </UCalendar>
</template>
