<script lang="ts">
import type {NuxtUIChipSize, NuxtUIColor} from '~/composables/useTheSlopeDesignSystem'

/** One legend entry: the sample a calendar paints a day as, and its name */
export type CalendarLegendItem =
  | {label: string, kind: 'circle', circleClass: string[]}
  | {label: string, kind: 'chip', chipColor: NuxtUIColor, circleClass: string[], showCount?: boolean, chipSize?: NuxtUIChipSize}
  | {label: string, kind: 'badge', badgeClass: string}
</script>

<script setup lang="ts">
/**
 * CalendarLegend - the "Forklaring" panel under a calendar
 *
 * ┌ ⓘ Forklaring ──────────────────────────────────────────────┐
 * │  (1) Næste fællesspisning   (1)* Ledige billetter   [1] Madhold 1 │
 * └────────────────────────────────────────────────────────────┘
 *   circle: a day circle in the variant's classes
 *   chip:   that circle wrapped in a chip, with a count when asked
 *   badge:  the team's rainbow band
 *
 * The same ALERTS.legend panel as DinnerModeLegend; the entries wrap in a row.
 * Rendered in BaseCalendar's #legend slot.
 */
defineProps<{
  items: CalendarLegendItem[]
}>()

const {ALERTS, ICONS, COMPONENTS, SIZES} = useTheSlopeDesignSystem()
</script>

<template>
  <UAlert v-bind="ALERTS.legend" :icon="ICONS.info" title="Forklaring" data-testid="calendar-legend">
    <template #description>
      <div :class="COMPONENTS.legend.entries">
        <div v-for="(item, index) in items" :key="index" :class="COMPONENTS.legend.entry" data-testid="calendar-legend-entry">
          <UChip
            v-if="item.kind === 'chip'"
            show
            :size="item.chipSize ?? SIZES.md"
            :color="item.chipColor"
            :text="item.showCount ? '1' : undefined"
          >
            <div :class="item.circleClass">1</div>
          </UChip>
          <UBadge
            v-else-if="item.kind === 'badge'"
            :size="SIZES.md"
            :class="[item.badgeClass, COMPONENTS.legend.badge]"
            data-testid="calendar-legend-badge"
          >
            1
          </UBadge>
          <div v-else :class="item.circleClass" data-testid="calendar-legend-circle">
            1
          </div>
          <span>{{ item.label }}</span>
        </div>
      </div>
    </template>
  </UAlert>
</template>
