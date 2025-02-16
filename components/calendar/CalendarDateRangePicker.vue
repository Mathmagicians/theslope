<script setup lang="ts">

import {inject, Ref} from "vue"
import type {DateRange} from "~/types/dateTypes";


const formatLabel = (key: keyof DateRange): string => {
  switch (key) {
    case 'start':
      return 'Start dato'
    case 'end':
      return 'Slut dato'
  }
}

defineOptions({
  inheritAttrs: false
})

const props = defineProps<{
  modelValue: DateRange
}>()

const emit = defineEmits(['update:model-value', 'close'])

const date = computed({
  get: () => props.modelValue,
  set: (value) => {
    if(value) {
      emit('update:model-value', value)
      emit('close')
    }
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

const isMd = inject<Ref<boolean>>('isMd')
const getIsMd = computed((): boolean => isMd?.value ?? false)

const handleInput = (e: Event) => {
  if (!e.target) return

  const target = e.target as HTMLInputElement
  const key = target.name as keyof DateRange
  const value = target.value

  console.log('handle Input (k,v,t):', {key, value, target})  // Debug log
  if (value.length < DATE_MASK.length) return // Don't update until full date entered


  // Don't mutate props directly - use computed date
  const parsedDate = parseDate(value)
  if (parsedDate) {
    date.value = {
      ...props.modelValue,
      [key]: parsedDate
    }
  }
}

</script>

<template>
  <client-only>
    {{ props.modelValue }}
    <VDatePicker
        v-model.range="date"
        :columns="getIsMd ? 2: 1"
        v-bind="{ ...attrs, ...$attrs }"
        @dayclick="onDayClick"
        color="purple"
    >
      <template #default="{ togglePopover, inputValue, inputEvents }">
        <div class="grid gap-4">
          <UInput
              v-for="key in ['start', 'end']"
              :key="key"
              :name="key"
              :value="inputValue[key]"
              v-on="inputEvents[key]"
              :label="`Vælg ${formatLabel(key).toLowerCase()}`"
              :placeholder="DATE_MASK"
              color="purple"
          >
            <template #trailing>
              <UButton
                  class="p-2"
                  color="pink"
                  variant="solid"
                  icon="i-heroicons-calendar" size="md"
                  @click="togglePopover"/>
            </template>
          </UInput>
        </div>
        <UButton
            class="p-2 bg-blue-500 text-sm text-white font-semibold rounded-md"
            @click="togglePopover"
            icon="i-heroicons-calendar"
            color="blue"
        />
      </template>

    </VDatePicker>
  </client-only>

</template>
