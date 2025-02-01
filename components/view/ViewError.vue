<script setup lang="ts">
interface Props {
  error: number|string
  message: string
}

defineProps<Props>()

const icons = Array.from({length: 32}, (_, i) => i)

function getRotationClass(i: number) {

  switch (i % 6) {
    case 0:
      return 'rotate-0'
      break
    case 1:
      return 'rotate-6'
      break
    case 2:
      return '-rotate-12'
      break
    case 3:
      return 'rotate-45'
      break
    case 4:
      return '-rotate-24'
      break
    case 5:
      return '-rotate-180'
      break
  }
}
</script>

<template>
  <div class="relative max-w-full">
    <div class="flex flex-wrap gap-4  md:gap-8">
      <UIcon
          v-for="(item,i) in icons"
          :key="i"
          name="fluent-emoji-high-contrast:confused-face"
          class="size-12 md:size-24 text-red-winery-500"
          :class="getRotationClass(i)"/>
    </div>

    <!-- Error Content -->
    <div class="absolute z-50 top-10 left-10 md:top-20 md:left-20 flex-grow items-start min-w-1/2 opacity-90 bg-red-winery-100 flex flex-col p-2 md:p-4">
      <!-- Error Code -->
      <p class="text-2xl md:text-4xl font-mono font-bold bg-red-winery-100 text-red-winery-900 rounded inline-block mb-2">
        Error {{ error }}
      </p>

      <!-- Error Message -->
      <p class="text-base md:text-lg text-red-winery-700">
        {{ message }}
      </p>

      <p class="text-base md:text-lg text-red-winery-700">
        <NuxtLink to="/">Fejl kan ske ... Lad os lige <span class="underline bold text-red-winery-800">starte forfra</span></NuxtLink>
      </p>
    </div>
  </div>
</template>
