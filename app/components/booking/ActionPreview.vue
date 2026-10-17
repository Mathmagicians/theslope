<!--
Action Preview - Shows users what will happen when they save booking changes: one line per person and action,
naming the dinners (up to three dates, else the count with the first and last date)

ASCII mockup (COMPONENTS.actionPreview: the list, each item a badge with its glyph):
┌─────────────────────────────────────────────────────────────────────┐
│ (ticket) Du er ved at ændre familiens booking                       │
│                                                                     │
│   [buy]      Anna køber en billet til salg: 19/10/2026              │
│   [queue]    Anna skrives på ventelisten: 20/10/2026, 21/10/2026    │
│   [queue]    Gæst af Anna skrives på ventelisten: 20/10/2026        │
│   [edit]     Lars ændrer spisemåde til Takeaway: 22/10/2026         │
│   [released] Lars frigiver sin billet: 23/10/2026                   │
│   [cancel]   Knud frameldes: 7 middage, 02/11/2026 – 14/12/2026     │
└─────────────────────────────────────────────────────────────────────┘

Visual check: a grid save at 375px and desktop; the longest line stays inside the panel.
-->

<script setup lang="ts">
import type {ActionPreviewItem} from '~/composables/useBookingUi'

interface Props {
  items: ActionPreviewItem[]
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Du er ved at ændre familiens booking'
})

const {ICONS, SIZES, ALERTS, NOISE, COMPONENTS} = useTheSlopeDesignSystem()
</script>

<template>
  <UAlert
    v-if="props.items.length > 0"
    v-bind="ALERTS.legend"
    :icon="ICONS.ticket"
    :title="props.title"
  >
    <template #description>
      <ul :class="COMPONENTS.actionPreview.list">
        <li
          v-for="(item, index) in props.items"
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
    </template>
  </UAlert>
</template>
