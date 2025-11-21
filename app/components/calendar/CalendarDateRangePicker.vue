<script setup lang="ts">
import type {DateRange} from "~/types/dateTypes"
import {DATE_SETTINGS, formatDateRange, translateToDanish} from "~/utils/date"
import {inject, type Ref} from "vue"
import {mapZodErrorsToFormErrors, getErrorMessage} from "~/utils/validtation"

// TYPES
type DateRangeInput = {
  start: string;
  end: string;
}

// COMPONENT DEFINITIONS
const model = defineModel<DateRange>({required: true})
const props = withDefaults(defineProps<{ debug?: boolean, name?: string }>(), {
  debug: false,
  name: undefined
})
const emit = defineEmits(['update:model-value', 'close'])

// STATE
const errors = ref<Map<string, string[]>>(new Map())

const inputState: Ref<DateRangeInput> = ref({
  start: formatDate(model.value.start),
  end: formatDate(model.value.end)
})

// COMPUTED STATE

const pickerDateRange = computed({
  get: () => {
    // Convert Date objects to CalendarDate for UCalendar
    if (model.value?.start && model.value?.end) {
      return {
        start: toCalendarDate(model.value.start),
        end: toCalendarDate(model.value.end)
      }
    }
    return null
  },
  set: (value) => {
    if (value?.start && value?.end) {
      // Convert CalendarDate back to Date objects
      const dateRange = {
        start: toDate(value.start),
        end: toDate(value.end)
      }
      updateDateRange(dateRange)
      emit('close')
    }
  }
})

// DEBUG LOGGING
if (props.debug) {
  console.log('CalendarDateRangePicker > Initialization:', {
    modelValue: {
      start: model.value?.start instanceof Date ? 'Date' : typeof model.value?.start,
      end: model.value?.end instanceof Date ? 'Date' : typeof model.value?.end,
      raw: formatDateRange(model.value)
    },
    inputState: inputState.value
  })
}

// ACTIONS
const updateDateRange = (newRange: DateRange) => {
  const validation = dateRangeSchema.safeParse(newRange)
  if (validation.success) {
    model.value = newRange
    inputState.value = {
      start: formatDate(newRange.start),
      end: formatDate(newRange.end)
    }
    emit('update:model-value', newRange)
    // Clear errors
    errors.value.clear()
    return true
  }
  // Set errors properly from validation
  const errorMap = mapZodErrorsToFormErrors(validation.error)
  errors.value.clear()
  errorMap.forEach((value, key) => {
    errors.value.set(key, value)
  })
  return false
}

const handleInputChange = (value: string, key: keyof DateRange) => {
  // Update the input field
  inputState.value[key] = value

  // Create an object to validate with stringDateRangeSchema
  const stringRange = {
    start: key === 'start' ? value : inputState.value.start,
    end: key === 'end' ? value : inputState.value.end
  }

  // Validate using the string schema first
  const validation = stringDateRangeSchema.safeParse(stringRange)

  if (validation.success) {
    // If validation passes, update with the transformed dates
    updateDateRange(validation.data)
  } else {
    // If validation fails, map the errors
    const errorMap = mapZodErrorsToFormErrors(validation.error)
    errors.value.clear()
    errorMap.forEach((value, key) => {
      errors.value.set(key, value)
    })
  }
}

const formatLabel = (key: keyof DateRange): string => {
  switch (key) {
    case 'start':
      return 'Start dato'
    case 'end':
      return 'Slut dato'
  }
}

const togglePopover = () => {
  console.log("toggle popover")
}

// Watch for external model changes
watch(() => model.value, (newModelValue) => {
  if (newModelValue) {
    inputState.value = {
      start: formatDate(newModelValue.start),
      end: formatDate(newModelValue.end)
    }
  }
}, {deep: true})

const isMd = inject<Ref<boolean>>('isMd')
const getIsMd = computed((): boolean => isMd?.value ?? false)

</script>

<template>
  <UPopover
:content="{
      align: 'center',
      side: 'bottom',
      sideOffset: 16
    }">
    <template #content>
      <UCalendar
          v-model="pickerDateRange"
          range
          :size="getIsMd ? 'xl': 'sm'"
          :number-of-months="getIsMd ? 2: 1"
          :week-starts-on="1"
          :fixed-weeks="false"
          weekday-format="short"
          color="success"
      >
        <template #week-day="{ day}">
      <span class="text-sm text-muted uppercase">
        {{ translateToDanish(day) }}
      </span>
        </template>
      </UCalendar>
    </template>
    <div :name="props.name" class="flex flex-row gap-1 md:gap-4">
      <UFormField
v-for="key in ['start', 'end'] as const" :key="key"
                  class="p-2"
                  :label="formatLabel(key)"
                  :error="getErrorMessage(errors, [key, '_'])">
        <UInput
v-model="inputState[key]" :placeholder="DATE_SETTINGS.USER_MASK"
                type="string"
                :name="key"
                @update:model-value="handleInputChange($event, key)"
        >
          <template #trailing>
            <UButton
icon="i-heroicons-calendar" color="info"
                     @click="togglePopover"/>
          </template>
        </UInput>
      </UFormField>
      <p v-if="debug">CalendarDateInput > Model Value is: {{ formatDateRange(model) }}, Input value is:
        {{ inputState }} </p>
    </div>
  </UPopover>
</template>
