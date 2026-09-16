<!--
UX MOCKUP: Season Selector with Status Indicators

┌─────────────────────────────────┐
│ 📅 Forår 2025            🟢 ▼ │  ◄─── Selected (ACTIVE - green circle)
│ ─────────────────────────────── │
│ 📅 Forår 2025            🟢    │  ◄─── ACTIVE (calendar icon, green circle)
│ 📅 Efterår 2025          🌱    │  ◄─── FUTURE (calendar icon, seedling)
│ 📅 Efterår 2025          🟡    │  ◄─── CURRENT (calendar icon, yellow circle)
│ 📦 Efterår 2024          ⚪    │  ◄─── PAST (archive icon, grey circle)
└─────────────────────────────────┘

Season Status Legend:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟢 ACTIVE    - Synlig for alle brugere (solid green)
🌱 FUTURE    - Fremtidig sæson (green seedling)
🟡 CURRENT   - Igangværende men ikke aktiv (yellow)
⚪ PAST      - Arkiveret sæson (grey/white)

Icons: 📅 Calendar for active/future/current, 📦 Archive for past
Sorting: Active → Future → Current → Past (by date)
-->

<script setup lang="ts">
import type {Season} from '~/composables/useSeasonValidation'
import {SEASON_STATUS} from '~/composables/useSeasonValidation'

interface Props {
  modelValue: number | null | undefined
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
const {COLOR} = useTheSlopeDesignSystem()

// Inject responsive breakpoint
const isMd = inject<Ref<boolean>>('isMd')
const getIsMd = computed((): boolean => isMd?.value ?? false)

// Get status icon for a season
const getStatusIcon = (season: Season): string => {
  const status = getSeasonStatus(season)

  switch (status) {
    case SEASON_STATUS.ACTIVE:
      return 'i-heroicons-calendar'
    case SEASON_STATUS.FUTURE:
      return 'i-heroicons-calendar'
    case SEASON_STATUS.CURRENT:
      return 'i-heroicons-calendar'
    case SEASON_STATUS.PAST:
      return 'i-heroicons-archive-box-solid'
    default:
      return 'i-question-mark-circle'
  }
}

// Get status emoji circle
const getStatusEmoji = (season: Season): string => {
  const status = getSeasonStatus(season)

  switch (status) {
    case SEASON_STATUS.ACTIVE:
      return '🟢'  // Solid green circle
    case SEASON_STATUS.FUTURE:
      return '🌱'  // Green heart (no green outline emoji exists)
    case SEASON_STATUS.CURRENT:
      return '🟡'  // Solid yellow circle
    case SEASON_STATUS.PAST:
    default:
      return '⚪'  // Grey circle
  }
}

// Sort seasons and add icons for USelect
type SeasonWithIcon = Season & { icon: string; suffix: string }

const sortedSeasonsWithIcons = computed<SeasonWithIcon[]>(() => {
  return sortSeasonsByActivePriority(props.seasons).map(season => ({
    ...season,
    icon: getStatusIcon(season),
    suffix: getStatusEmoji(season)
  }))
})

const selectedSeasonId = computed({
  get: () => props.modelValue ?? undefined,  // USelect doesn't accept null, convert to undefined
  set: (value: number) => emit('update:modelValue', value)
})
</script>

<template>
  <USelect
      v-model="selectedSeasonId"
      arrow
      data-testid="season-selector"
      :color="COLOR.secondary"
      :loading="props.loading"
      :placeholder="seasons?.length > 0 ? 'Vælg sæson' : '💤 Ingen sæsoner'"
      :items="sortedSeasonsWithIcons"
      label-key="shortName"
      value-key="id"
      icon-key="icon"
      suffix-key="suffix"
      leading
      trailing
      :disabled="props.disabled || props.seasons.length === 0"
      :class="props.class"
      :size="getIsMd ? 'lg' : 'sm'"
      class="min-w-48"
  >
    <template #leading>
      <UIcon
        v-if="selectedSeasonId && sortedSeasonsWithIcons.find(s => s.id === selectedSeasonId)"
        :name="sortedSeasonsWithIcons.find(s => s.id === selectedSeasonId)!.icon"
      />
    </template>
    <template #trailing>
      <span v-if="selectedSeasonId && sortedSeasonsWithIcons.find(s => s.id === selectedSeasonId)">
        {{ sortedSeasonsWithIcons.find(s => s.id === selectedSeasonId)!.suffix }}
      </span>
    </template>
  </USelect>
</template>
