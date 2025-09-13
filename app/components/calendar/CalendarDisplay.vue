<script setup lang="ts">
import type {DateRange, WeekDayMap} from '~/types/dateTypes'

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

// CALENDAR ATTRIBUTES TO DISPLAY COOKING DAYS AND HOLIDAYS
const attrs = ref([
  {
    key: 'holidays',
    dot: 'green',
    dates: allHolidays.value
  },
  {
    key: 'dinners',
    highlight: {
      color: 'purple',
      fillMode: 'solid'
    },
    dates: resultDays.value
  }
])

const isMd = inject<Ref<boolean>>('isMd')
const getIsMd = computed((): boolean => isMd?.value ?? false)

</script>

<template>
    <UCalendar
        show-iso-weeknumbers
        :size="getIsMd ? 'xl': 'sm'"
        :number-of-months="getIsMd ? 3: 1"
        :attributes="attrs"
        :min-value="seasonDatesAsCalendarDates.start"
        :max-value="seasonDatesAsCalendarDates.end"
    />
</template>
