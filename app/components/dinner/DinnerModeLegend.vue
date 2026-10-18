<!--
DinnerModeLegend - the dinner-mode entries of the "Forklaring" panel (CalendarLegend)

Shared by the booking grid (week/month) and the single-dinner form, which differ only
in which extras they explain: the grid also has a modified-cell marker, the queue marker and a hint; both explain an
expected booking while a cell without an order shows one. Its rows join CalendarLegend's list, one entry per row: the
sample in the fixed-width column (COMPONENTS.legend.sample), its explanation beside it, so every explanation starts on
one vertical line.

┌ ⓘ Forklaring ────────────────────────────────────────────┐
│  [🍽️]         Spisesal                                   │
│  [🌙]         Sen                                        │
│  [🛍️]         Takeaway                                   │
│  [❌]         Ingen                                      │
│  [❓]         Blandet                                    │
│  ┃[🍽️]        Ændret                                     │
│  (mode)°⌛    På venteliste (#n)                          │
│  [ex] (mode)  Forventet bestilling ifølge præferencer     │
│  Klik på en celle for at ændre din booking … (hint)      │
└──────────────────────────────────────────────────────────┘
(mode)°⌛ = the wish ghosted (COMPONENTS.waitlist) under the corner chip, grid only
[ex] (mode) = the sliders the day form's ticket carries (ICONS.preferences at COMPONENTS.ticket.stateIcon.expected)
beside an expected booking ghosted on neutral (COMPONENTS.bookingGrid.expectedBadge), while one shows
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
    <div v-for="mode in modes" :key="mode" :class="COMPONENTS.legend.entry">
      <div :class="COMPONENTS.legend.sample">
        <DinnerModeSelector
            :model-value="mode"
            :form-mode="FORM_MODES.VIEW"
            :size="SIZES.xs"
        />
      </div>
      <span :class="TYPOGRAPHY.finePrint">{{ MODE_WORDS[mode].label }}</span>
    </div>
    <div v-if="showNoConsensus" :class="COMPONENTS.legend.entry">
      <div :class="COMPONENTS.legend.sample">
        <DinnerModeSelector
            :model-value="DinnerMode.DINEIN"
            :form-mode="FORM_MODES.VIEW"
            :size="SIZES.xs"
            :consensus="false"
        />
      </div>
      <span :class="TYPOGRAPHY.finePrint">{{ BOOKING_WORDS.mixedModes }}</span>
    </div>
    <div v-if="showModified" :class="COMPONENTS.legend.entry" data-testid="dinner-mode-legend-modified">
      <div :class="COMPONENTS.legend.sample">
        <DinnerModeSelector
            :model-value="DinnerMode.DINEIN"
            :form-mode="FORM_MODES.VIEW"
            :size="SIZES.xs"
            is-modified
        />
      </div>
      <span :class="TYPOGRAPHY.finePrint">{{ BOOKING_WORDS.legend.modified }}</span>
    </div>
    <div v-if="showWaitlist" :class="COMPONENTS.legend.entry" data-testid="dinner-mode-legend-waitlist">
      <div :class="COMPONENTS.legend.sample">
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
      </div>
      <span :class="TYPOGRAPHY.finePrint">{{ BOOKING_WORDS.legend.waitlist }}</span>
    </div>
    <div v-if="showExpected" :class="COMPONENTS.legend.entry" data-testid="dinner-mode-legend-expected">
      <div :class="COMPONENTS.legend.sample">
        <UIcon :name="ICONS.preferences" :class="COMPONENTS.ticket.stateIcon.expected" />
        <DinnerModeSelector
            :model-value="DinnerMode.DINEIN"
            :form-mode="FORM_MODES.VIEW"
            :size="SIZES.xs"
            expected
        />
      </div>
      <span :class="TYPOGRAPHY.finePrint">{{ BOOKING_WORDS.expectedBooking }}</span>
    </div>
  </CalendarLegend>
</template>
