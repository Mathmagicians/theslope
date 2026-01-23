<!--
Action Preview - Shows users what will happen when they save booking changes

ASCII mockup:
┌─────────────────────────────────────────────────────────────┐
│ 🎫 Du er ved at ændre familiens booking                     │
│                                                             │
│   [primary] Anna tilmeldes                                  │
│   [error]   Peters billet frigives                          │
│   [info]    Gæst af Anna køber fra andre                    │
└─────────────────────────────────────────────────────────────┘
-->

<script setup lang="ts">
import type {ActionPreviewItem} from '~/composables/useBooking'

interface Props {
  items: ActionPreviewItem[]
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Du er ved at ændre familiens booking'
})

const {ICONS, COLOR, SIZES} = useTheSlopeDesignSystem()
</script>

<template>
  <UAlert
    v-if="props.items.length > 0"
    :icon="ICONS.ticket"
    :color="COLOR.neutral"
    variant="outline"
    :title="props.title"
  >
    <template #description>
      <ul class="mt-2 space-y-1">
        <li
          v-for="(item, index) in props.items"
          :key="index"
          class="flex items-center gap-2"
        >
          <UBadge
            :color="item.color"
            variant="subtle"
            :size="SIZES.small"
          >
            <UIcon :name="item.icon" class="mr-1" />
            {{ item.text }}
          </UBadge>
        </li>
      </ul>
    </template>
  </UAlert>
</template>
