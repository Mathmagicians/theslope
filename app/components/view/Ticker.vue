<script setup lang="ts">
/**
 * Ticker - Animated word ticker for landing page
 *
 * Uses Pantone color palette from design system for consistent branding
 */

interface Props {
  words?: string[]
}

withDefaults(defineProps<Props>(), {
  words: () => ['marque test']
})

const animationClass = () => {
  return 'animate-marquee'
}

// Use Pantone colors from design system (matches landing page rainbow)
const pantoneStyles = [
  'border-amber-900 bg-amber-100 text-amber-900',     // Mocha Mousse (PRIMARY)
  'border-pink-800 bg-pink-100 text-pink-800',        // Pink Lemonade
  'border-orange-600 bg-orange-100 text-orange-800',  // Mandarin Orange
  'border-party-800 bg-party-50 text-party-900',      // Party Punch
  'border-ocean-600 bg-ocean-50 text-ocean-900',      // Ocean/Sky
  'border-peach-700 bg-peach-50 text-peach-950',      // Peach Cobbler
  'border-violet-800 bg-violet-100 text-violet-900'   // Bonbon
]

const getStyle = (index: number) => {
  return pantoneStyles[index % pantoneStyles.length]
}
</script>

<template>
  <ul
    class="w-full flex flex-nowrap flex-row items-center justify-center md:justify-start text-center lowercase text-xs md:text-base whitespace-nowrap"
    :class="animationClass()"
  >
    <li v-for="(word, index) in words" :key="index">
      <span class="p-1 m-1 md:px-4 md:px-2 border md:border-2 rounded-lg" :class="getStyle(index)">
        {{ word }}
      </span>
    </li>
  </ul>
</template>
