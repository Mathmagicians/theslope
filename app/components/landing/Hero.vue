<script setup lang="ts">
const { BACKGROUNDS, TYPOGRAPHY, BG, TEXT } = useTheSlopeDesignSystem()
</script>

<template>
  <div class="w-full h-7/8 max-h-screen">
    <h1 :class="`text-left py-2 md:py-4 ${TYPOGRAPHY.heroTitle} ${BACKGROUNDS.landing.titleBar}`">
      Velkommen til Skråningen
    </h1>
    <div class="relative min-w-full">
      <img src="~/assets/skraanere.jpg" alt="skrånere samlet som hjerte" class="h-full w-full object-cover">
      <div :class="`absolute bottom-1 left-0 w-2/3 md:w-1/2 ${BG.mocha[900]} opacity-60`">
        <h2 :class="`text-left ${TEXT.mocha[50]} text-sm md:text-3xl font-bold uppercase md:p-4`">
          Vi er et bofælleskab i smukke Lejre, med hjerterum og plads, til store og små.
        </h2>
      </div>
    </div>
  </div>
</template>
