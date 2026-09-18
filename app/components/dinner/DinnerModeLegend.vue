<!--
DinnerModeLegend - the ONE "Forklaring" panel for dinner-mode surfaces

Shared by the booking grid (week/month) and the single-dinner form, which differ only
in which extras they explain: the grid also has a modified-cell marker and a hint.

┌ ⓘ Forklaring ───────────────────────────────────────────────┐
│  [🍽️]      [🌙]    [🛍️]      [❌]     [❓]      ┃[🍽️]      │
│  Spisesal   Sen     Takeaway   Ingen    Blandet   Ændret    │
│  Klik på en celle for at ændre din booking …  (hint, grid)  │
└─────────────────────────────────────────────────────────────┘
-->
<script setup lang="ts">
import {DinnerMode} from '~/composables/useBookingValidation'
import {FORM_MODES} from '~/types/form'

withDefaults(defineProps<{
  /** Which modes to explain */
  modes?: DinnerMode[]
  /** Power mode's "mixed preferences" badge - on wherever a household row can disagree */
  showNoConsensus?: boolean
  /** Grid only: the unsaved-cell border accent */
  showModified?: boolean
  /** Grid only: how to operate the cells */
  hint?: string
}>(), {
  modes: () => [DinnerMode.DINEIN, DinnerMode.DINEINLATE, DinnerMode.TAKEAWAY, DinnerMode.NONE],
  showNoConsensus: true,
  showModified: false,
  hint: undefined
})

const {ALERTS, ICONS, SIZES, TYPOGRAPHY} = useTheSlopeDesignSystem()
</script>

<template>
  <UAlert v-bind="ALERTS.legend" :icon="ICONS.info" title="Forklaring" data-testid="dinner-mode-legend">
    <template #description>
      <div class="flex flex-wrap gap-x-6 gap-y-2">
        <DinnerModeSelector
            v-for="mode in modes"
            :key="mode"
            :model-value="mode"
            :form-mode="FORM_MODES.VIEW"
            show-label
            :size="SIZES.xs"
        />
        <DinnerModeSelector
            v-if="showNoConsensus"
            :model-value="DinnerMode.DINEIN"
            :form-mode="FORM_MODES.VIEW"
            show-label
            :size="SIZES.xs"
            :consensus="false"
        />
        <div v-if="showModified" class="flex flex-col items-center gap-0.5" data-testid="dinner-mode-legend-modified">
          <DinnerModeSelector
              :model-value="DinnerMode.DINEIN"
              :form-mode="FORM_MODES.VIEW"
              :size="SIZES.xs"
              is-modified
          />
          <span :class="TYPOGRAPHY.finePrint">Ændret</span>
        </div>
      </div>
      <p v-if="hint" :class="[TYPOGRAPHY.finePrint, 'mt-2 text-muted']">{{ hint }}</p>
    </template>
  </UAlert>
</template>
