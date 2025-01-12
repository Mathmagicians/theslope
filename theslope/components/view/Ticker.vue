<script setup lang="ts">
const words = ['natur', 'fællesskab', 'bæredygtighed', 'nationalpark', 'fællesspisning', 'fredagsbar', 'hjemmekoncerter', 'pool', 'byttehylde', 'lånebil', 'hugelbede']
const style = (index: number) => {
  switch (index % 4) {
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
    default: {
      return 'border-lavender-bonbon-900 bg-lavender-bonbon-200 text-lavender-bonbon-900';
      break;
    }
  }
}

</script>

<template>
  <div class="flex flex-1 flex-col">
      <ul class="inline-flex flex-nowrap flex-row items-center justify-center md:justify-start text-center lowercase font-bold md:font-extrabold text-xl md:text-2xl   animate-marquee whitespace-nowrap">
        <li v-for="(word, index)  in words">
        <span class="p-2 m-1.5 md:px-4 border-2" :class="style(index)" v-if="index%2 === 0">
          {{ word }}</span>
        </li>
      </ul>
      <ul class="inline-flex flex-nowrap items-center justify-center md:justify-start text-center lowercase font-bold md:font-extrabold text-xl md:text-2xl m-1.5 p-1 md:px-4 border-2 animate-marqueer whitespace-nowrap">
        <li v-for="(word, index)  in words">
        <span :class="style(index)" v-if="index%2 !== 0">
          {{ word }}</span>
        </li>
      </ul>
    </div>
</template>
