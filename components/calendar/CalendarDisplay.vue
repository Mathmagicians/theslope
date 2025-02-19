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
    allHolidays.value))

// CALENDAR ATTRIBUTES TO DISPLAY COOKINGDAYS AND HOLIDAYS
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
  <client-only>
    <VCalendar
        show-iso-weeknumbers
        :expanded="!getIsMd"
        :columns="getIsMd ? 2: 1"
        :attributes="attrs"
        :min-date="seasonDates.start"
        :max-date="seasonDates.end"
    />
  </client-only>
</template>
