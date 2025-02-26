<script setup lang="ts">
import type {DateRange} from "~/types/dateTypes";
import {DATE_SETTINGS, formatDateRange} from "~/utils/date";
import {inject, Ref} from "vue";
import {FormMode} from "~/types/form";


const model = defineModel<DateRange>({required: true})
const props = withDefaults(defineProps<{ debug?: boolean }>(),  {
  debug: false
})
const errors = ref<Map<string, string[]>>(new Map())

const inputState = ref({
  start: formatDate(model.value.start),
  end: formatDate(model.value.end)
})

const emit = defineEmits(['update:model-value', 'close'])

const dates = computed({
  get: () => model.value,
  set: (value) => {
    if(value) {
      emit('update:model-value', value)
      emit('close')
    }
  }
})

const handleInputChange = (value: string, key: keyof DateRange) => {
  const newRange = {
    ...model.value,
    [key]: parseDate(value)
  }
  model.value = newRange
  errors.value = validateDateRange(inputState.value).errors
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

watch(model, async (newModelValue:DateRange, oldModelValue:DateRange) => {
  const newDateStringRange = { start:formatDate(newModelValue.start), end:formatDate(newModelValue.end)}
  inputState.value = newDateStringRange
  errors.value = validateDateRange(inputState.value).errors
})

const isMd = inject<Ref<boolean>>('isMd')
const getIsMd = computed((): boolean => isMd?.value ?? false)

</script>

<template>
  <div>
    <client-only>
      <VDatePicker
          v-model.range="dates"
          isrange
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
                        :error="errors.get(key)?.[0] || errors.get('_')?.[0] || ''">
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
            <p v-if="debug">CalendarDateInput > Model Value is: {{ formatDateRange(model) }}, Input value is: {{ inputState }} </p>
            <UButton
                v-if="props.debug"
                class="p-2 bg-blue-500 text-sm text-white font-semibold rounded-md"
                @click="togglePopover"
                icon="i-heroicons-calendar"
                color="blue"
            />
          </div>
        </template>

      </VDatePicker>
    </client-only>

  </div>
</template>
