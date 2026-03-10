<script setup lang="ts">
import {DATE_SETTINGS, translateToDanish} from "~/utils/date"
import type {Ref} from "vue"
import {mapZodErrorsToFormErrors, getErrorMessage} from "~/utils/validtation"

// COMPONENT DEFINITIONS
const model = defineModel<Date | null>({required: true})
const props = withDefaults(defineProps<{ label?: string, name?: string }>(), {
  label: 'Dato',
  name: undefined
})
const emit = defineEmits(['update:model-value'])

// DESIGN SYSTEM
const {SIZES} = useTheSlopeDesignSystem()

// STATE
const errors = ref<Map<string, string[]>>(new Map())

const inputState: Ref<string> = ref(
  model.value ? formatDate(model.value) : ''
)

// COMPUTED STATE

const pickerDate = computed({
  get: () => {
    // Convert Date object to CalendarDate for UCalendar
    if (model.value) {
      return toCalendarDate(model.value)
    }
    return undefined
  },
  set: (value) => {
    if (value) {
      // Convert CalendarDate back to Date object
      const date = toDate(value)
      updateDate(date)
    }
  }
})

// ACTIONS
const updateDate = (newDate: Date | null) => {
  if (newDate === null) {
    model.value = null
    inputState.value = ''
    emit('update:model-value', null)
    // Clear errors
    errors.value.clear()
    return true
  }

  const validation = dateSchema.safeParse(newDate)
  if (validation.success) {
    model.value = validation.data
    inputState.value = formatDate(validation.data)
    emit('update:model-value', validation.data)
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

const handleInputChange = (value: string) => {
  // Update the input field
  inputState.value = value

  // Empty string → clear to null
  if (value.trim() === '') {
    updateDate(null)
    return
  }

  // Validate using dateSchema (accepts dd/MM/yyyy, ISO, Date)
  const validation = dateSchema.safeParse(value)

  if (validation.success) {
    // If validation passes, update with the transformed date
    updateDate(validation.data)
  } else {
    // If validation fails, map the errors
    const errorMap = mapZodErrorsToFormErrors(validation.error)
    errors.value.clear()
    errorMap.forEach((value, key) => {
      errors.value.set(key, value)
    })
  }
}

// Watch for external model changes
watch(() => model.value, (newModelValue) => {
  inputState.value = newModelValue ? formatDate(newModelValue) : ''
}, {deep: true})

// Expose for testing
defineExpose({
  errors,
  updateDate
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
        v-model="pickerDate"
        :size="SIZES.calendar"
        :week-starts-on="1"
        :fixed-weeks="false"
        weekday-format="short"
        color="success"
      >
        <template #week-day="{ day }">
          <span class="text-sm text-muted uppercase">
            {{ translateToDanish(day) }}
          </span>
        </template>
      </UCalendar>
    </template>
    <UFormField
      class="p-2"
      :label="props.label"
      :error="getErrorMessage(errors, ['_', 'date'])">
      <UInput
        v-model="inputState"
        :placeholder="DATE_SETTINGS.USER_MASK"
        type="string"
        :name="props.name"
        @update:model-value="handleInputChange($event as string)"
      >
        <template #trailing>
          <UButton icon="i-heroicons-calendar" color="info"/>
        </template>
      </UInput>
    </UFormField>
  </UPopover>
</template>
