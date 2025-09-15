<script setup lang="ts">

interface Props {
  words: string[]
}

const props = withDefaults(defineProps<Props>(), {
  words:  ()  => ['marque test']
})

const animationClass = () => {
  return 'animate-marquee'
}

const seed = Math.floor(Math.random() * 10)
const style = (index: number) => {
  switch (index % 5) {
    case 0 : {
      return 'border-blue-600 bg-blue-100 text-blue-800';
      break;
    }
    case 1: {
      return 'border-red-900 bg-red-100 text-red-800';
      break;
    }
    case 2: {
      return 'border-pink-900 bg-pink-100 text-pink-800';
      break;
    }
    case 3: {
      return 'border-orange-900 bg-orange-100 text-orange-800';
      break;
    }
    case 4: {
      return 'border-amber-900 bg-amber-100 text-amber-800';
      break;
    }
    default: {
      return 'border-violet-900 bg-violet-200 text-violet-900';
      break;
    }
  }
}

</script>

<template>
  <ul class="w-full flex flex-nowrap flex-row
  items-center justify-center md:justify-start
  text-center lowercase  text-xs md:text-base whitespace-nowrap"
      :class="animationClass()">
    <li v-for="(word, index)  in words" :key="index">
        <span class="p-1 m-1 md:px-4 md:px-2 border md:border-2 rounded-lg" :class="style(index)">
          {{ word }}
        </span>
    </li>
  </ul>
</template>
