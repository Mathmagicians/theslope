<script setup lang="ts">
const seed = Math.floor(Math.random() * 10);
const words = ['natur', 'fællesskab', 'bæredygtighed', 'nationalpark', 'fællesspisning', 'fredagsbar', 'hjemmekoncerter', 'pool', 'byttehylde', 'lånebiler', 'hugelbede', 'børneleg', 'bålplads','solnedgange','bier']
const style = (index: number) => {
  switch (index % 5) {
    case 0 : {
      return 'border-blue-curacao-600 bg-blue-curacao-100 text-blue-curacao-800 ';
      break;
    }
    case 1: {
      return 'border-red-winery-900 bg-red-winery-100 text-red-winery-800';
      break;
    }
    case 2: {
      return 'border-pink-lemonade-900 bg-pink-lemonade-100 text-pink-lemonade-800';
      break;
    }
    case 3: {
      return 'border-orange-mandarin-900 bg-orange-mandarin-100 text-orange-mandarin-800';
      break;
    }
    default: {
      return 'border-lavender-bonbon-900 bg-lavender-bonbon-200 text-lavender-bonbon-900';
      break;
    }
  }
}

</script>

<template>
  <div class="max-w-full flex flex-col overflow-clip">
      <ul class="inline-flex flex-nowrap flex-row items-center justify-center md:justify-start text-center lowercase  text-sm md:text-base  animate-marquee whitespace-nowrap m-1">
        <li v-for="(word, index)  in words">
        <span v-if="index%2 === 0" class="p-1 m-1 md:px-4 md:px-2 border-2 rounded-lg" :class="style(index+seed)">
          {{ word }}</span>
        </li>
      </ul>
      <ul class="inline-flex flex-nowrap items-center justify-center md:justify-start text-center lowercase font-bold md:font-extrabold text-xl md:text-2xl m-1.5  animate-marqueer whitespace-nowrap">
        <li v-for="(word, index)  in words">
        <span v-if="index%2 !== 0"  class="p-2 m-1.5 md:px-4 border-2" :class="style(index)">
          {{ word }}</span>
        </li>
      </ul>
    </div>
</template>
