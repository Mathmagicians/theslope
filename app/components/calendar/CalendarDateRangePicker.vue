<script setup lang="ts" generic="T extends DateRange | NullableDateRange = DateRange">
import type {DateRange, NullableDateRange} from "~/types/dateTypes"
import {DATE_SETTINGS, translateToDanish} from "~/utils/date"
import {inject, type Ref} from "vue"
import {mapZodErrorsToFormErrors, getErrorMessage} from "~/utils/validtation"
import type {z} from 'zod'

// TYPES
type DateRangeInput = {
  start: string;
  end: string;
}

// Schema prop type — accepts any Zod schema that outputs DateRange or NullableDateRange
// Third generic param (Input) is `unknown` because schemas transform strings/ISO dates to Date objects
type DateRangeSchemaType = z.ZodType<DateRange | NullableDateRange, z.ZodTypeDef, unknown>

// COMPONENT DEFINITIONS
const model = defineModel<T>({required: true})
const props = withDefaults(defineProps<{
  name?: string,
  /** Zod schema for validation — drives nullable/refinement behavior */
  schema?: DateRangeSchemaType,
  /** Custom labels for start/end fields */
  labels?: { start: string, end: string }
}>(), {
  name: undefined,
  schema: () => dateRangeSchema as DateRangeSchemaType,
  labels: () => ({ start: 'Start dato', end: 'Slut dato' })
})
const emit = defineEmits(['update:model-value', 'close'])

// STATE
const errors = ref<Map<string, string[]>>(new Map())

const inputState: Ref<DateRangeInput> = ref({
  start: formatDate(model.value.start),
  end: formatDate(model.value.end ?? undefined)
})

// COMPUTED STATE
const pickerDateRange = computed({
  get: () => {
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
      updateDateRange({ start: toDate(value.start), end: toDate(value.end) } as T)
      emit('close')
    }
  }
})

// ACTIONS
const updateDateRange = (newRange: T) => {
  const validation = props.schema.safeParse(newRange)
  if (validation.success) {
    model.value = newRange
    inputState.value = {
      start: formatDate(newRange.start),
      end: formatDate(newRange.end ?? undefined)
    }
    emit('update:model-value', newRange)
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

const handleInputChange = (value: string, key: 'start' | 'end') => {
  inputState.value[key] = value

  const stringRange = {
    start: key === 'start' ? value : inputState.value.start,
    end: key === 'end' ? value : inputState.value.end
  }

  const validation = props.schema.safeParse(stringRange)
  if (validation.success) {
    updateDateRange(validation.data as T)
  } else {
    const errorMap = mapZodErrorsToFormErrors(validation.error)
    errors.value.clear()
    errorMap.forEach((value, key) => {
      errors.value.set(key, value)
    })
  }
}

// Watch for external model changes
watch(() => model.value, (newModelValue) => {
  if (newModelValue) {
    inputState.value = {
      start: formatDate(newModelValue.start),
      end: formatDate(newModelValue.end ?? undefined)
    }
  }
}, {deep: true})

const isMd = inject<Ref<boolean>>('isMd')
const getIsMd = computed((): boolean => isMd?.value ?? false)

// Expose for testing
defineExpose({
  errors,
  updateDateRange
})

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
                  :label="props.labels[key]"
                  :error="getErrorMessage(errors, [key, '_'])">
        <UInput
v-model="inputState[key]" :placeholder="DATE_SETTINGS.USER_MASK"
                type="string"
                :name="key"
                @update:model-value="handleInputChange($event, key)"
        >
          <template #trailing>
            <UButton icon="i-heroicons-calendar" color="info"/>
          </template>
        </UInput>
      </UFormField>
    </div>
  </UPopover>
</template>
