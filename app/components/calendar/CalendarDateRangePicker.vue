<script setup lang="ts">
import type {DateRange} from "~/types/dateTypes"
import {DATE_SETTINGS, formatDateRange} from "~/utils/date"
import {inject, type Ref} from "vue"
import {mapZodErrorsToFormErrors, getErrorMessage} from "~/utils/validtation"

// TYPES
type DateRangeInput = {
  start: string;
  end: string;
}

// COMPONENT DEFINITIONS
const model = defineModel<DateRange>({required: true})
const props = withDefaults(defineProps<{ debug?: boolean }>(), {
  debug: false
})
const emit = defineEmits(['update:model-value', 'close'])

// STATE
const errors = ref<Map<string, string[]>>(new Map())

const inputState: Ref<DateRangeInput>  = ref({
  start: formatDate(model.value.start),
  end: formatDate(model.value.end)
})

// COMPUTED STATE

const pickerDateRange = computed({
  get: () => model.value,
  set: (value) => {
    if (value) {
      // Update model and inputState
      updateDateRange(value)
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
  if(validation.success) {
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

const attrs = {
  'transparent': false,
  'borderless': false,
  'color': 'pink',
  'is-dark': {selector: 'html', darkClass: 'dark'},
  'first-day-of-week': 2
}

function onDayClick(_: any, event: MouseEvent): void {
  const target = event.target as HTMLElement
  target.blur() //unfocus the clicked element
}

// Watch for external model changes
watch(() => model.value, (newModelValue) => {
  if (newModelValue) {
    inputState.value = {
      start: formatDate(newModelValue.start),
      end: formatDate(newModelValue.end)
    }
  }
}, { deep: true })

const isMd = inject<Ref<boolean>>('isMd')
const getIsMd = computed((): boolean => isMd?.value ?? false)

</script>

<template>
  <div>
    <client-only>
      <UCalendar
          v-model="pickerDateRange"
          range
          :columns="getIsMd ? 2: 1"
          v-bind="{ ...attrs, ...$attrs }"
          @dayclick="onDayClick"
          color="purple"
      >
        <template #default="{ togglePopover, inputValue, inputEvents }">
          <div class="flex flex-col md:flex-row gap-4">
            <UFormGroup v-for="key in ['start', 'end'] as const" :key="key"
                        class="p-2"
                        :label="formatLabel(key)"
                        :error="getErrorMessage(errors, [key, '_'])">
              <UInput :placeholder="DATE_SETTINGS.USER_MASK" type="string"
                      :ui="{ icon: { trailing: { pointer: '' } } }"
                      :name="key"
                      @update:model-value="handleInputChange($event, key)"
                      v-model="inputState[key]"
              >
                <template #trailing>
                  <UButton @click="togglePopover" icon="i-heroicons-calendar"
                           color="pink"/>
                </template>
              </UInput>
            </UFormGroup>
            <p v-if="debug">CalendarDateInput > Model Value is: {{ formatDateRange(model) }}, Input value is:
              {{ inputState }} </p>
          </div>
        </template>

      </VDatePicker>
    </client-only>

  </div>
</template>
