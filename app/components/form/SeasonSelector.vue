<!--
SeasonSelector: one option per season, sorted active, in progress, upcoming, ended; a calendar icon leads, the archive
icon for an ended season, and the season's status glyph follows the name

┌─────────────────────────────────┐
│ [cal] Forår 2025        (●)  ▼ │  the selected season, its glyph trailing
│ ─────────────────────────────── │
│ [cal] Forår 2025        (●)    │  active: green disc
│ [cal] Efterår 2025      (●)    │  in progress, not activated: yellow disc
│ [cal] Efterår 2025      (sp)   │  upcoming: the green sprout
│ [box] Efterår 2024      (●)    │  ended: grey disc
└─────────────────────────────────┘

[cal] = ICONS.calendar, [box] = ICONS.seasonPast; the discs and the sprout are UBadges with SEASON_STATUS_GLYPHS as their settings
-->

<script setup lang="ts">
import type {Season} from '~/composables/useSeasonValidation'
import {SEASON_STATUS} from '~/config/seasonWords'
import type {SeasonStatusValue} from '~/utils/season'

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
const now = useClock()
const {COLOR, SIZES, ICONS, COMPONENTS, SEASON_STATUS_GLYPHS} = useTheSlopeDesignSystem()

// Sorted for USelect, each season carrying its status and its leading icon, the archive box for an ended season
type SeasonWithIcon = Season & { status: SeasonStatusValue; icon: string }

const sortedSeasonsWithIcons = computed<SeasonWithIcon[]>(() => {
  return sortSeasonsByActivePriority(props.seasons, now.value).map(season => {
    const status = getSeasonStatus(season, now.value)
    return {...season, status, icon: status === SEASON_STATUS.PAST ? ICONS.seasonPast : ICONS.calendar}
  })
})

const selectedOption = computed(() => sortedSeasonsWithIcons.value.find(s => s.id === selectedSeasonId.value))

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
      leading
      trailing
      :disabled="props.disabled || props.seasons.length === 0"
      :class="[COMPONENTS.seasonSelector.select, props.class]"
      :size="SIZES.seasonSelect"
  >
    <template #leading>
      <UIcon v-if="selectedOption" :name="selectedOption.icon" />
    </template>
    <template #trailing>
      <UBadge v-if="selectedOption" v-bind="SEASON_STATUS_GLYPHS[selectedOption.status]" data-testid="season-status-mark" />
    </template>
    <template #item-trailing="{ item }">
      <UBadge v-bind="SEASON_STATUS_GLYPHS[item.status]" />
    </template>
  </USelect>
</template>
