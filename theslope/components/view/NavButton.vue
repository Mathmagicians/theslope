<script setup lang="ts">
const MyButton = resolveComponent('MyButton')
</script>

<template>
  <p>
    <span class="flex m-1 md:m-2 md:p-1 center text-xs md:text-sm border-l-8 border-blue-curacao-500
    odd:hover:-rotate-6 even:rotate-3 hover:ring-2 hover:ring-blue-curacao-200">
      <ChefIcon class="text-sm md:text-lg"/>
    <NuxtLink to="/chef">
    <slot/>
    </NuxtLink>
  </span>
  </p>
</template>
