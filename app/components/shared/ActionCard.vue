<!--
┌─────────────────────────────────────────────────────────────────┐
│ ActionCard - Dashboard navigation card with colored header      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ╭─────────────────────────────────────────────────────╮   │ │
│  │ │            bg-{color}-100                           │   │ │
│  │ │                                                     │   │ │
│  │ │                  🍽️ (48px icon)                     │   │ │
│  │ │                                                     │   │ │
│  │ ╰─────────────────────────────────────────────────────╯   │ │
│  │                                                           │ │
│  │ CARD TITLE                                                │ │
│  │ ─────────────────────────────────────────────────────     │ │
│  │ Description text explaining what this section does        │ │
│  │                                                           │ │
│  │ 📅 Stat line 1                                            │ │
│  │ 🎟️ Stat line 2                                            │ │
│  │                                                           │ │
│  │                          [ Button label → ]               │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
-->
<script setup lang="ts">
import type { NuxtUIColor } from '~/composables/useTheSlopeDesignSystem'

interface StatItem {
  icon: string
  text: string
}

interface Props {
  icon: string
  title: string
  description: string
  stats?: StatItem[]
  buttonLabel: string
  buttonIcon?: string
  color: NuxtUIColor
  headerBg: string // Tailwind bg class from BG constant (e.g., BG.peach[50])
  to: string
}

const props = withDefaults(defineProps<Props>(), {
  stats: () => []
})

const { TYPOGRAPHY, SIZES, ICONS } = useTheSlopeDesignSystem()
// The design system comes from a composable call, which withDefaults cannot reference
const effectiveButtonIcon = computed(() => props.buttonIcon ?? ICONS.arrowRight)
</script>

<template>
  <UCard class="h-full flex flex-col">
    <!-- Colored header with large icon -->
    <template #header>
      <div
        :class="[headerBg, 'rounded-t-lg -mx-4 -mt-4 px-4 py-6 md:py-8 flex items-center justify-center']"
      >
        <UIcon
          :name="icon"
          class="text-5xl md:text-6xl opacity-80"
        />
      </div>
    </template>

    <!-- Card body -->
    <div class="flex-1 flex flex-col">
      <!-- Title -->
      <h3 :class="[TYPOGRAPHY.cardTitle, 'mb-2']">
        {{ title }}
      </h3>

      <!-- Description -->
      <p :class="[TYPOGRAPHY.bodyTextMuted, 'mb-4']">
        {{ description }}
      </p>

      <!-- Stats -->
      <div v-if="stats.length > 0" class="space-y-1 mb-4">
        <div
          v-for="(stat, index) in stats"
          :key="index"
          class="flex items-center gap-2"
        >
          <UIcon :name="stat.icon" class="text-sm opacity-70" />
          <span :class="TYPOGRAPHY.bodyTextSmall">{{ stat.text }}</span>
        </div>
      </div>

      <!-- Spacer to push button to bottom -->
      <div class="flex-1" />
    </div>

    <!-- Footer with CTA button -->
    <template #footer>
      <UButton
        :to="to"
        :color="color"
        :size="SIZES.standard"
        :trailing-icon="effectiveButtonIcon"
        block
      >
        {{ buttonLabel }}
      </UButton>
    </template>
  </UCard>
</template>
