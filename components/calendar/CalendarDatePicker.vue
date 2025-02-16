// components/CalendarDatePicker.vue
<script setup lang="ts">
interface Props {
  modelValue: Date
}

interface Emits {
  (e: 'update:modelValue', value: Date): void
  (e: 'error', value: string): void
}

defineOptions({
  inheritAttrs: false
})

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { error, validateDate } = useDateValidation()

const handleDateUpdate = (newDate: Date) => {
  const result = validateDate(newDate)
  if (result.isValid) {
    emit('update:modelValue', result.date)
  } else {
    emit('error', result.error)
  }
}
</script>

<template>
  <div class="relative">
    <UPopover :popper="{ placement: 'bottom-start' }">
      <UFormGroup>
        <div class="relative">
          <DatePicker
              v-model="modelValue"
              :masks="DATE_MASKS"
              :locale="DATE_LOCALE"
              @update:modelValue="handleDateUpdate"
          >
            <template #default="{ inputValue, inputEvents }">
              <div class="relative">
                <UInput
                    v-bind="$attrs"
                    :value="inputValue"
                    v-on="inputEvents"
                    :placeholder="$attrs.placeholder || DATE_MASKS.input[0]"
                    :variant="error ? 'error' : undefined"
                >
                  <template #help>
                    Acceptable formats: {{ DATE_MASKS.input.join(', ') }}
                  </template>
                  <template #trailing>
                    <UPopoverTrigger>
                      <UButton
                          color="gray"
                          variant="ghost"
                          icon="i-heroicons-calendar-days-20-solid"
                      />
                    </UPopoverTrigger>
                  </template>
                </UInput>
              </div>
            </template>
          </DatePicker>
          <template #message>
            <UFormMessage v-if="error">{{ error }}</UFormMessage>
          </template>
        </div>
      </UFormGroup>

      <template #panel="{ close }">
        <div class="p-2 bg-white rounded-lg shadow-lg">
          <Calendar
              v-model="modelValue"
              :masks="DATE_MASKS"
              :locale="DATE_LOCALE"
              @dayclick="(day) => {
              handleDateUpdate(day.date)
              close()
            }"
          />
        </div>
      </template>
    </UPopover>
  </div>
</template>
