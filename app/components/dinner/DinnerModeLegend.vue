<!--
DinnerModeLegend - the dinner-mode entries of the "Forklaring" panel (CalendarLegend)

Shared by the booking grid (week/month) and the single-dinner form, which differ only
in which extras they explain: the grid also has a modified-cell marker, the queue marker and a hint; both always explain
an expected booking. Its rows join CalendarLegend's list, one entry per row: the
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
│  [cake]       Ny billetpris fra fødselsdagen             │
│  [ex] (mode)  Forventet bestilling ifølge præferencer     │
│  Klik på en celle for at ændre din booking … (hint)      │
└──────────────────────────────────────────────────────────┘
(mode)°⌛ = the wish ghosted (COMPONENTS.waitlist) under the corner chip, grid only
[cake] = the birthday badge's glyph on its neutral badge, where a row carries the badge
[ex] (mode) = the sliders the day form's ticket carries (ICONS.preferences at COMPONENTS.ticket.stateIcon.expected)
beside an expected booking ghosted on neutral (COMPONENTS.bookingGrid.expectedBadge)
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
  /** A row carries the birthday badge: a person's first dinner at a new ticket type */
  showBirthday?: boolean
  /** Grid only: how to operate the cells */
  hint?: string
}>(), {
  modes: () => DINNER_MODE_ORDER,
  showNoConsensus: true,
  showModified: false,
  showWaitlist: false,
  showBirthday: false,
  hint: undefined
})

const {ICONS, SIZES, TYPOGRAPHY, COMPONENTS, COLOR, NOISE} = useTheSlopeDesignSystem()
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
    <div v-if="showBirthday" :class="COMPONENTS.legend.entry" data-testid="dinner-mode-legend-birthday">
      <div :class="COMPONENTS.legend.sample">
        <UBadge :color="COLOR.neutral" :variant="NOISE.soft" :size="SIZES.small" :icon="ICONS.birthday" />
      </div>
      <span :class="TYPOGRAPHY.finePrint">{{ BOOKING_WORDS.legend.birthday }}</span>
    </div>
    <div :class="COMPONENTS.legend.entry" data-testid="dinner-mode-legend-expected">
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
