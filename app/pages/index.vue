<script setup lang="ts">
const words = ['natur', 'fællesskab', 'bæredygtighed', 'nationalpark', 'fællesspisning', 'fredagsbar', 'hjemmekoncerter', 'pool', 'byttehylde', 'lånebiler', 'hugelbede', 'børneleg', 'bålplads','solnedgange','bier']

const { BACKGROUNDS, TYPOGRAPHY } = useColorSystem()
</script>

<template>
  <div class="flex flex-col">
    <Hero />
    <div :class="`w-full py-21 md:py-2 min-h-12 overflow-hidden ${BACKGROUNDS.landing.ticker}`">
      <Ticker :words="words" class="my-2"/>
    </div>

    <div :class="`min-h-screen md:min-h-1/4 ${BACKGROUNDS.landing.section1}`">
      <h2 :class="TYPOGRAPHY.sectionTitle">46 husstande</h2>
    </div>
    <div :class="`min-h-screen md:min-h-1/4 ${BACKGROUNDS.landing.section2}`">
      <h2 :class="TYPOGRAPHY.sectionTitle">Forpligtende fællesskab</h2>
    </div>
    <div :class="`min-h-screen md:min-h-1/4 ${BACKGROUNDS.landing.section3}`">
      <h2 :class="TYPOGRAPHY.sectionTitle">Økologisk fællesspisning fire gange om ugen skaber fællesskab</h2>
    </div>
    <div :class="`min-h-screen md:min-h-1/4 ${BACKGROUNDS.landing.section4}`">
      <h2 :class="TYPOGRAPHY.sectionTitle">Danmarks smukkeste solnedgange i smørhullet Lejre</h2>
    </div>
  </div>
</template>
