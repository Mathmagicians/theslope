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
import {SEASON_STATUS} from '~/composables/useSeasonValidation'

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

const {getSeasonStatus, sortSeasonsByActivePriority} = useSeason()

// Inject responsive breakpoint
const isMd = inject<Ref<boolean>>('isMd')
const getIsMd = computed((): boolean => isMd?.value ?? false)

// Get status icon for a season
const getStatusIcon = (season: Season): string => {
  const status = getSeasonStatus(season)

  switch (status) {
    case SEASON_STATUS.ACTIVE:
      return 'i-heroicons-check-circle-solid'
    case SEASON_STATUS.FUTURE:
      return 'i-heroicons-calendar'
    case SEASON_STATUS.CURRENT:
      return 'i-heroicons-calendar'
    case SEASON_STATUS.PAST:
      return 'i-heroicons-archive-box-solid'
    default:
      return 'i-heroicons-calendar'
  }
}

// Sort seasons and add icons for USelect
type SeasonWithIcon = Season & { icon: string }

const sortedSeasonsWithIcons = computed<SeasonWithIcon[]>(() => {
  return sortSeasonsByActivePriority(props.seasons).map(season => ({
    ...season,
    icon: getStatusIcon(season)
  }))
})

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
      color="secondary"
      :loading="props.loading"
      :placeholder="seasons?.length > 0 ? 'Vælg sæson' : '💤 Ingen sæsoner'"
      :items="sortedSeasonsWithIcons"
      labelKey="shortName"
      valueKey="id"
      iconKey="icon"
      leading
      :disabled="props.disabled || props.seasons.length === 0"
      :class="props.class"
      :size="getIsMd ? 'lg' : 'sm'"
      class="min-w-48"
  >
  </USelect>
</template>
