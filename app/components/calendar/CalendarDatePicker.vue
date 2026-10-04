<script setup lang="ts">
import {isCalendarDateInDateList} from "~/utils/date"
import type {DateValue} from '@internationalized/date'
import {mapZodErrorsToFormErrors, getErrorMessage} from "~/utils/validtation"

// COMPONENT DEFINITIONS
const model = defineModel<Date | null>({required: true})
const props = withDefaults(defineProps<{ label?: string, name?: string }>(), {
  label: 'Dato',
  name: undefined
})
const emit = defineEmits(['update:model-value'])

// DESIGN SYSTEM
const {SIZES, ICONS, CALENDAR, BUTTONS, COMPONENTS, calendarPickerProps, dayCircleClasses} = useTheSlopeDesignSystem()
const calendarProps = calendarPickerProps()

// A single date is always a cooking-day pick (CALENDAR.picker); the slot draws it
const isDaySelected = (day: DateValue) => isCalendarDateInDateList(day, model.value ? [model.value] : [])

// STATE
const errors = ref<Map<string, string[]>>(new Map())

// COMPUTED STATE
// One model: the typed segments and the calendar read and write the same CalendarDate
const pickerDate = computed<DateValue | undefined>({
  get: () => model.value ? toCalendarDate(model.value) : undefined,
  set: (value) => {
    updateDate(value ? toDate(value) : null)
  }
})

// ACTIONS
const updateDate = (newDate: Date | null) => {
  if (newDate === null) {
    model.value = null
    emit('update:model-value', null)
    errors.value.clear()
    return true
  }

  const validation = dateSchema.safeParse(newDate)
  if (validation.success) {
    model.value = validation.data
    emit('update:model-value', validation.data)
    errors.value.clear()
    return true
  }
  const errorMap = mapZodErrorsToFormErrors(validation.error)
  errors.value.clear()
  errorMap.forEach((value, key) => {
    errors.value.set(key, value)
  })
  return false
}

// Expose for testing
defineExpose({
  errors,
  updateDate
})

</script>

<template>
  <UFormField
    class="p-2"
    :label="props.label"
    :error="getErrorMessage(errors, ['_', 'date'])">
    <UInputDate
      v-bind="COMPONENTS.dateField"
      v-model="pickerDate"
      :name="props.name"
    >
      <template #trailing>
        <UPopover
          :content="{
            align: 'center',
            side: 'bottom',
            sideOffset: 16
          }">
          <UButton v-bind="BUTTONS.edit" :icon="ICONS.calendar" aria-label="Åbn kalender" />
          <template #content>
            <UCalendar
              v-bind="calendarProps"
              v-model="pickerDate"
              :size="SIZES.calendar"
            >
              <template #day="{ day }">
                <div v-if="isDaySelected(day)" :class="dayCircleClasses(CALENDAR.picker.cookingDay)">{{ day.day }}</div>
                <span v-else class="text-sm">{{ day.day }}</span>
              </template>
            </UCalendar>
          </template>
        </UPopover>
      </template>
    </UInputDate>
  </UFormField>
</template>
