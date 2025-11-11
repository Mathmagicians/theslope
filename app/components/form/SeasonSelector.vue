<!--
UX MOCKUP: Season Selector with Status Indicators

┌─────────────────────────────┐
│ ▼ Vælg sæson               │
│ ───────────────────────────  │
│ ● Forår 2025               │  ◄─── ACTIVE (solid green circle)
│ ◌ Efterår 2025              │  ◄─── FUTURE (dashed green circle)
│ ◌ Forår 2026                │  ◄─── FUTURE (dashed green circle)
│ ◉ Efterår 2024              │  ◄─── PAST (solid grey circle)
│ ◉ Forår 2024                │  ◄─── PAST (solid grey circle)
└─────────────────────────────┘

Season Status Legend:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
● Forår 2025           🟢 ACTIVE    (solid green circle)
◌ Efterår 2025         🟢 FUTURE    (dashed green circle)
◉ Efterår 2024         ⚫ PAST      (solid grey circle)

Sorting: Active → Future (by start date) → Past (by start date descending)
-->

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
