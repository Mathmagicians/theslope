<!--
SeasonSelector: one option per season, sorted active, in progress, upcoming, ended; a calendar icon leads, the archive
icon for an ended season, and the STATUS_GLYPHS marker follows the name

┌─────────────────────────────────┐
│ [cal] Forår 2025         🟢  ▼ │  the selected season
│ ─────────────────────────────── │
│ [cal] Forår 2025         🟢    │  active: visible to every member
│ [cal] Efterår 2025       🟡    │  in progress, not activated
│ [cal] Efterår 2025       🌱    │  starts later
│ [box] Efterår 2024       ⚪    │  archived
└─────────────────────────────────┘

[cal] = ICONS.calendar, [box] = ICONS.seasonPast, the markers = STATUS_GLYPHS, all through SEASON_STATUS_MARKS
-->

<script setup lang="ts">
import type {Season} from '~/composables/useSeasonValidation'

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
const {COLOR, SIZES, COMPONENTS, SEASON_STATUS_MARKS} = useTheSlopeDesignSystem()

// Sorted for USelect, each season carrying its status icon and marker
type SeasonWithIcon = Season & { icon: string; suffix: string }

const sortedSeasonsWithIcons = computed<SeasonWithIcon[]>(() => {
  return sortSeasonsByActivePriority(props.seasons).map(season => ({
    ...season,
    icon: SEASON_STATUS_MARKS[getSeasonStatus(season)].icon,
    suffix: SEASON_STATUS_MARKS[getSeasonStatus(season)].glyph
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
      :class="[COMPONENTS.seasonSelector.select, props.class]"
      :size="SIZES.seasonSelect"
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
