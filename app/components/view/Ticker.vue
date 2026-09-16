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

const {getPantoneChip} = useTheSlopeDesignSystem()

const animationClass = () => {
  return 'animate-marquee'
}
</script>

<template>
  <ul
    class="w-full flex flex-nowrap flex-row items-center justify-center md:justify-start text-center lowercase text-xs md:text-base whitespace-nowrap"
    :class="animationClass()"
  >
    <li v-for="(word, index) in words" :key="index">
      <span class="p-1 m-1 md:px-4 md:px-2 border md:border-2 rounded-lg" :class="getPantoneChip(index)">
        {{ word }}
      </span>
    </li>
  </ul>
</template>
