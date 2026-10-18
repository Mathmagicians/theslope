<!--
DinnerModeLegend - the dinner-mode entries of the "Forklaring" panel (CalendarLegend)

Shared by the booking grid (week/month) and the single-dinner form, which differ only
in which extras they explain: the grid also has a modified-cell marker, the queue marker and a hint; both explain an
expected booking while a cell without an order shows one.

┌ ⓘ Forklaring ────────────────────────────────────────────────────────────────┐
│  [🍽️]      [🌙]    [🛍️]      [❌]     [❓]      ┃[🍽️]      (mode)°hourglass       │
│  Spisesal   Sen     Takeaway   Ingen    Blandet   Ændret    På venteliste (#n)   │
│  (mode)                                                                       │
│  Forventet efter præferencer                                                  │
│  Klik på en celle for at ændre din booking …  (hint, grid)                    │
└──────────────────────────────────────────────────────────────────────────────┘
(mode)°hourglass = the wish ghosted (COMPONENTS.waitlist) under the corner chip, grid only
(mode) = an expected booking outlined (COMPONENTS.bookingGrid.expectedBadge), while one shows
-->
<script setup lang="ts">
import {DinnerMode} from '~/composables/useBookingValidation'
import {BOOKING_WORDS} from '~/config/bookingWords'
import {FORM_MODES} from '~/types/form'

withDefaults(defineProps<{
  /** Which modes to explain */
  modes?: DinnerMode[]
  /** Power mode's "mixed preferences" badge - on wherever a household row can disagree */
  showNoConsensus?: boolean
  /** Grid only: the unsaved-cell border accent */
  showModified?: boolean
  /** Grid only: the queued cell, the wish ghosted under the hourglass */
  showWaitlist?: boolean
  /** A cell without an order showing the booking the preferences give it */
  showExpected?: boolean
  /** Grid only: how to operate the cells */
  hint?: string
}>(), {
  modes: () => [DinnerMode.DINEIN, DinnerMode.DINEINLATE, DinnerMode.TAKEAWAY, DinnerMode.NONE],
  showNoConsensus: true,
  showModified: false,
  showWaitlist: false,
  showExpected: false,
  hint: undefined
})

const {ICONS, SIZES, TYPOGRAPHY, COMPONENTS} = useTheSlopeDesignSystem()
</script>

<template>
  <CalendarLegend :hint="hint" data-testid="dinner-mode-legend">
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
    <div v-if="showModified" :class="COMPONENTS.legend.stackedEntry" data-testid="dinner-mode-legend-modified">
      <DinnerModeSelector
          :model-value="DinnerMode.DINEIN"
          :form-mode="FORM_MODES.VIEW"
          :size="SIZES.xs"
          is-modified
      />
      <span :class="TYPOGRAPHY.finePrint">Ændret</span>
    </div>
    <div v-if="showWaitlist" :class="COMPONENTS.legend.stackedEntry" data-testid="dinner-mode-legend-waitlist">
      <UChip v-bind="COMPONENTS.waitlist.chip">
        <DinnerModeSelector
            :model-value="DinnerMode.DINEIN"
            :form-mode="FORM_MODES.VIEW"
            :size="SIZES.xs"
            ghost
        />
        <template #content>
          <UIcon :name="ICONS.waitlist" :class="COMPONENTS.waitlist.chipIcon" />
        </template>
      </UChip>
      <span :class="TYPOGRAPHY.finePrint">På venteliste (#n)</span>
    </div>
    <div v-if="showExpected" :class="COMPONENTS.legend.stackedEntry" data-testid="dinner-mode-legend-expected">
      <DinnerModeSelector
          :model-value="DinnerMode.DINEIN"
          :form-mode="FORM_MODES.VIEW"
          :size="SIZES.xs"
          expected
      />
      <span :class="TYPOGRAPHY.finePrint">{{ BOOKING_WORDS.expectedBooking }}</span>
    </div>
  </CalendarLegend>
</template>
