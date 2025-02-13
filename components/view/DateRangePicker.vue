<script setup lang="ts">


import type {DatePickerDate, DatePickerRangeObject} from "v-calendar/dist/types/src/use/datePicker";

defineOptions({
  inheritAttrs: false
})

const props = defineProps({
  modelValue: {
    type: [Date, Object] as PropType<DatePickerDate | DatePickerRangeObject | null>,
    default: null
  }
})

const emit = defineEmits(['update:model-value', 'close'])

const date = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:model-value', value)
    emit('close')
  }
})

const attrs = {
  'transparent': true,
  'borderless': true,
  'color': 'primary',
  'is-dark': { selector: 'html', darkClass: 'dark' },
  'first-day-of-week': 2
}

function onDayClick(_: any, event: MouseEvent): void {
  const target = event.target as HTMLElement
  target.blur()
}
</script>

<template>
  <VDatePicker
      v-if="date && (date as DatePickerRangeObject)?.start && (date as DatePickerRangeObject)?.end"
      v-model.range="date"
      :columns="2"
      v-bind="{ ...attrs, ...$attrs }"
      @dayclick="onDayClick"
  />
  <VDatePicker
      v-else
      v-model="date"
      v-bind="{ ...attrs, ...$attrs }"
      @dayclick="onDayClick"
  />
</template>
