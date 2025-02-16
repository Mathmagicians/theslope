<script setup lang="ts">
import type {DateRange} from "~/types/dateTypes";
import {DATE_SETTINGS, formatDateRange} from "~/utils/date";


const model = defineModel<DateRange>({required: true})
const errors = ref<Map<string, string[]>>(new Map())

const inputState = ref({
  start: formatDate(model.value.start),
  end: formatDate(model.value.end)
})

const handleInputChange = (value: string, key: keyof DateRange) => {
  const newRange = {
    ...model.value,
    [key]: parseDate(value)
  }
  model.value = newRange
  errors.value = validateDateRange(inputState.value).errors

  console.log('CalendarDateInput > updated model ', formatDateRange(model.value), key, model.value, parseDate(value))
  console.warn('errors', errors.value)
  console.log('Input change:', {
    value,
    parsedDate: parseDate(value),
    validationErrors: errors.value
  })
}
const formatLabel = (key: keyof DateRange): string => {
  switch (key) {
    case 'start':
      return 'Start dato'
    case 'end':
      return 'Slut dato'
  }
}

</script>

<template>
  <div class="flex flex-col md:flex-row gap-4">
    <UFormGroup v-for="key in ['start', 'end'] as const" :key="key"
                class="p-2"
                :label="formatLabel(key)"
                :error="errors.get(key)?.[0] || errors.get('_')?.[0] || ''">
      <!-- ui prop needed for trailing calendar icon to accept click events -->
      <UInput :placeholder="DATE_SETTINGS.USER_MASK" type="string"
              :ui="{ icon: { trailing: { pointer: '' } } }"
              :name="key" v-model="inputState[key]"
              @update:model-value="handleInputChange($event, key)">
        <template #trailing>
          <UButton @click="console.log('CalendarDateInput > clicked calendar icon')" icon="i-heroicons-calendar"/>
        </template>
      </UInput>
    </UFormGroup>
    <p>CalendarDateInput > Model Value is: {{ formatDateRange(model) }}, Input value is: {{ inputState }} </p>

  </div>
</template>
