<script setup lang="ts">
import type {Season} from '~/composables/useSeasonValidation'

interface Props {
  modelValue: number | undefined
  seasons: Season[]
  loading?: boolean
  disabled?: boolean
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  disabled: false,
  class: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const selectedSeasonId = computed({
  get: () => props.modelValue,
  set: (value: number) => emit('update:modelValue', value)
})
</script>

<template>
  <USelect
      arrow
      data-testid="season-selector"
      v-model="selectedSeasonId"
      color="warning"
      :loading="props.loading"
      :placeholder="seasons?.length > 0 ? 'Vælg sæson' : '💤 Ingen sæsoner'"
      :items="props.seasons"
      labelKey="shortName"
      valueKey="id"
      :disabled="props.disabled || props.seasons.length === 0"
      :class="props.class"
  >
  </USelect>
</template>
