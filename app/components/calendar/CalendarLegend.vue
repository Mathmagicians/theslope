<script lang="ts">
import type {NuxtUIChipSize, NuxtUIColor} from '~/composables/useTheSlopeDesignSystem'

/** One legend entry: the sample a calendar paints a day as, and its name */
export type CalendarLegendItem =
  | {label: string, kind: 'circle', circleClass: string[]}
  | {label: string, kind: 'chip', chipColor: NuxtUIColor, circleClass: string[], count?: string, icon?: string, chipSize?: NuxtUIChipSize}
  | {label: string, kind: 'badge', badgeClass: string}
</script>

<script setup lang="ts">
/**
 * CalendarLegend - the one "Forklaring" panel
 *
 * ┌ ⓘ Forklaring ──────────────────────────────────────────────────────────────────────────┐
 * │  (1) Næste fællesspisning   (1)* Ledige billetter   (1)[wl] Venteliste   [1] Madhold 1 │
 * │  <default slot: a surface's own entries>                                               │
 * │  hint                                                                                  │
 * └────────────────────────────────────────────────────────────────────────────────────────┘
 *   circle: a day circle in the variant's classes
 *   chip:   that circle wrapped in a chip, reading the item's count, or carrying the item's glyph [wl] inset
 *           in a chip a size up (COMPONENTS.legend.iconChip)
 *   badge:  the team's rainbow band
 *
 * The calendars pass `items` and render it in BaseCalendar's #legend slot. DinnerModeLegend fills the
 * default slot with its mode samples and passes the grid's operating `hint`.
 */
withDefaults(defineProps<{
  items?: CalendarLegendItem[]
  /** The operating hint under the entries */
  hint?: string
}>(), {
  items: () => [],
  hint: undefined
})

const {ALERTS, ICONS, COMPONENTS, SIZES, TYPOGRAPHY} = useTheSlopeDesignSystem()
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
            :text="item.count"
            :ui="item.icon ? COMPONENTS.legend.iconChip.ui : undefined"
          >
            <div :class="item.circleClass">1</div>
            <template v-if="item.icon" #content>
              <UIcon :name="item.icon" :class="COMPONENTS.legend.iconChip.icon" />
            </template>
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
        <slot />
      </div>
      <p v-if="hint" :class="[TYPOGRAPHY.finePrint, COMPONENTS.legend.hint]">{{ hint }}</p>
    </template>
  </UAlert>
</template>
