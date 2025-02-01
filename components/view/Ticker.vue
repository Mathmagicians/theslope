<script setup lang="ts">

interface Props {
  words: string[]
  reverse?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  reverse: false
});

const animationClass = () => {
  return props.reverse ? 'animate-marqueer' : 'animate-marquee';
}

const seed = Math.floor(Math.random() * 10)
const style = (index: number) => {
  switch (index % 5) {
    case 0 : {
      return 'border-blue-curacao-600 bg-blue-curacao-100 text-blue-curacao-800';
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
    case 4: {
      return 'border-mocha-mousse-900 bg-mocha-mousse-100 text-mocha-mousse-800';
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
  <ul class="w-screen flex flex-nowrap flex-row
  items-center justify-center md:justify-start
  text-center lowercase  text-sm md:text-base whitespace-nowrap m-1 overflow-clip"
      :class="animationClass()">
    <li v-for="(word, index)  in words" :key="index">
        <span class="p-1 m-1 md:px-4 md:px-2 border-2 rounded-lg" :class="style(index)">
          {{ word }}
        </span>
    </li>
  </ul>
</template>
