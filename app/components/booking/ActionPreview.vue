<!--
Action Preview - What a save will do, read from the server's dry run of the save (formatPreviewLines): a day per
dinner under its separator, ascending; within a day a line per action in the word table's order, then per person in the
household's order; the tickets sold to the waiting list close their day. Every booking surface renders its preview here.

ASCII mockup (ALERTS.legend; each day a USeparator on COMPONENTS.separator.moment with its weekday and date, each line
a badge with its glyph in COMPONENTS.actionPreview):
┌──────────────────────────────────────────────────────────────┐
│ (ticket) Du er ved at ændre familiens booking                │
│ ──────────────────── ti 20/10/2026 ───────────────────────── │
│   [queue]     Anna skrives på ventelisten (Voksen #3)        │
│ ──────────────────── to 22/10/2026 ───────────────────────── │
│   [edit]      Anna ændrer spisemåde til Takeaway             │
│   [edit]      Lars ændrer spisemåde til Takeaway             │
│ ──────────────────── fr 23/10/2026 ───────────────────────── │
│   [released]  Anna frigiver sin billet                       │
│   [released]  Lars frigiver sin billet                       │
│ ──────────────────── ti 27/10/2026 ───────────────────────── │
│   [buy]       Anna køber en billet til salg                  │
│   [sold]      1 billet sælges til ventelisten                │
└──────────────────────────────────────────────────────────────┘
A booker's guests of one ticket type read as one group: "Gæst af Anna (Voksen ×2) tilmeldes".

While the preview loads (`pending`), the loader line in a table's #loading look (COMPONENTS.table.loadingRow) stands in
its place:
      (sync, spinning)  Prøver at beregne hvad I skal spise hvornår...

Visual check: a grid save, a day form row, the guest form and the preference editor at 375px and desktop; the day
separators read weekday and date, the longest line stays inside the panel, the loader shows while the preview loads.
-->

<script setup lang="ts">
import type {ActionPreviewDay} from '~/composables/useBookingUi'
import {BOOKING_WORDS} from '~/config/bookingWords'

interface Props {
  days: ActionPreviewDay[]
  title?: string
  pending?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: BOOKING_WORDS.preview.title,
  pending: false
})

const {ICONS, SIZES, ALERTS, NOISE, COMPONENTS} = useTheSlopeDesignSystem()
</script>

<template>
  <div v-if="props.pending" :class="COMPONENTS.table.loadingRow" data-testid="action-preview-loading">
    <UIcon :name="ICONS.sync" :size="SIZES.smallIconSize" :class="COMPONENTS.table.loadingSpinner" />
    {{ BOOKING_WORDS.preferencePreviewLoading }}
  </div>
  <UAlert
    v-else-if="props.days.length > 0"
    v-bind="ALERTS.legend"
    :icon="ICONS.ticket"
    :title="props.title"
    data-testid="action-preview"
  >
    <template #description>
      <div v-for="day in props.days" :key="day.dinnerEventId" data-testid="action-preview-day">
        <USeparator v-bind="COMPONENTS.separator.moment" :label="day.label" />
        <ul :class="COMPONENTS.actionPreview.list">
          <li
            v-for="(item, index) in day.lines"
            :key="index"
            :class="COMPONENTS.actionPreview.item"
          >
            <UBadge
              :color="item.color"
              :variant="NOISE.subtle"
              :size="SIZES.small"
            >
              <UIcon :name="item.icon" :class="COMPONENTS.actionPreview.icon" />
              {{ item.text }}
            </UBadge>
          </li>
        </ul>
      </div>
    </template>
  </UAlert>
</template>
