<script setup lang="ts">

import { sub, format, isSameDay, type Duration } from 'date-fns'

const ranges = [
  { label: 'Last 7 days', duration: { days: 7 } },
  { label: 'Last 14 days', duration: { days: 14 } },
  { label: 'Last 30 days', duration: { days: 30 } },
  { label: 'Last 3 months', duration: { months: 3 } },
  { label: 'Last 6 months', duration: { months: 6 } },
  { label: 'Last year', duration: { years: 1 } }
]
const selected = ref({ start: sub(new Date(), { days: 14 }), end: new Date() })

function isRangeSelected(duration: Duration) {
  return isSameDay(selected.value.start, sub(new Date(), duration)) && isSameDay(selected.value.end, new Date())
}

function selectRange(duration: Duration) {
  selected.value = { start: sub(new Date(), duration), end: new Date() }
}
const date = ref(new Date())

const attrs = ref([
  {
    key: 'today',
    highlight: {
      color: 'green',
      fillMode: 'solid'
    },
    dates: new Date()
  }
])

const attrs1 = ref([
  {
    key: 'today',
    highlight: {
      color: 'blue',
      fillMode: 'solid'
    }
  }
])

</script>

<template>
  <div>
    <client-only>
      <h2>Calendar fra nuxt module</h2>
      <VCalendar v-model="date" :attributes="attrs1"/>
      <h2>Date Picker</h2>
      <VDatePicker v-model="date" :attributes="attrs" />
    </client-only>
    <UDivider />
    <h2>Calendar fra egen komponent DateRangePicker</h2>
    <UPopover :popper="{ placement: 'bottom-start' }" color="white">
      <UButton icon="i-heroicons-calendar-days-20-solid">
        {{ format(selected.start, 'd MMM, yyy') }} - {{ format(selected.end, 'd MMM, yyy') }}
      </UButton>

      <template #panel="{ close }">
        <div class="flex items-center sm:divide-x divide-gray-200 dark:divide-gray-800">
          <div class="hidden sm:flex flex-col py-4">
            <UButton
                v-for="(range, index) in ranges"
                :key="index"
                :label="range.label"
                color="gray"
                variant="ghost"
                class="rounded-none px-6"
                :class="[isRangeSelected(range.duration) ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50']"
                truncate
                @click="selectRange(range.duration)"
            />
          </div>

          <DateRangePicker v-model="selected" @close="close" />
        </div>
      </template>
    </UPopover>
    <UDivider />
    <h2>
      AdminPlanning
    </h2>
    <AdminPlanning />

  </div>


</template>
