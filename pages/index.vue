<script setup lang="ts">

const words = ['natur', 'fællesskab', 'bæredygtighed', 'nationalpark', 'fællesspisning', 'fredagsbar', 'hjemmekoncerter', 'pool', 'byttehylde', 'lånebiler', 'hugelbede', 'børneleg', 'bålplads','solnedgange','bier']

</script>

<template>
  <div class="flex flex-col">
    <Hero />
    <div class="bg-mocha-mousse-500 flex flex-col space-y-2 md:space-y-4 min-h-24">
      <Ticker :words="words" class="my-2"/>
      <Ticker :words="words" :reverse="true" class="my-2"/>
    </div>

    <div class="min-h-screen md:min-h-1/4  bg-pink-lemonade-500">
      <h2 class="text-pink-lemonade-50 uppercase text-2xl md:text-4xl">46 husstande</h2>
    </div>
    <div class="min-h-screen md:min-h-1/4  bg-orange-mandarin-500">
      <h2 class="text-orange-mandarin-100 uppercase text-2xl md:text-4xl">Forpligtende fællesskab</h2>
    </div>
  </div>
</template>
<script setup lang="ts">
</script>
