<script setup lang="ts">
import type {DateValue} from '@internationalized/date'
import type {CalendarPickerSelection} from '~/composables/useTheSlopeDesignSystem'

type PickerModel = DateValue | {start: DateValue, end: DateValue} | null | undefined

const model = defineModel<PickerModel>()
const props = withDefaults(defineProps<{
  selection?: CalendarPickerSelection
  range?: boolean
  numberOfMonths?: number
  isDaySelected: (day: DateValue) => boolean
}>(), {
  selection: 'cookingDay',
  range: false,
  numberOfMonths: 1
})

const {SIZES, ICONS, CALENDAR, BUTTONS, calendarPickerProps, dayCircleClasses} = useTheSlopeDesignSystem()
const calendarProps = calendarPickerProps()

// What is being picked decides how a selected day reads (CALENDAR.picker); the slot draws it
const selectionVariant = computed(() => CALENDAR.picker[props.selection])
</script>

<template>
  <UPopover
      :content="{
        align: 'center',
        side: 'bottom',
        sideOffset: 16
      }">
    <UButton
        v-bind="BUTTONS.edit"
        :icon="ICONS.calendar"
        aria-label="Åbn kalender"
    />
    <template #content>
      <UCalendar
          v-bind="calendarProps"
          v-model="model"
          :range="props.range"
          :size="SIZES.calendar"
          :number-of-months="props.numberOfMonths"
      >
        <template #day="{ day }">
          <div v-if="props.isDaySelected(day)" :class="dayCircleClasses(selectionVariant)">{{ day.day }}</div>
          <span v-else class="text-sm">{{ day.day }}</span>
        </template>
      </UCalendar>
    </template>
  </UPopover>
</template>
