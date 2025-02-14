<script setup lang="ts">


import type {DatePickerDate, DatePickerRangeObject} from "v-calendar/dist/types/src/use/datePicker"
import type {PropType} from "vue";

defineOptions({
  inheritAttrs: false
})

const props = defineProps({
  modelValue: {
    type: [Date, Object] as PropType<DatePickerDate | DatePickerRangeObject | null>,
    required: true,
    validator(value: DatePickerRangeObject): boolean {
      return value?.start && value?.end ? true : false
    }
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
</script>

<template>
  <client-only>
  <VDatePicker
      v-model.range="date"
      :columns="2"
      v-bind="{ ...attrs, ...$attrs }"
      @dayclick="onDayClick"
      color="purple"
  />
  </client-only>

</template>
