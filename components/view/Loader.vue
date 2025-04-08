<script setup lang="ts">
const props = defineProps<{ text?: string }>()
</script>
<template>
  <div class="flex flex-col min-h-screen justify-center items-center">
    <h2 class="text-large  uppercase text-blue-600">
      Loading data for
    </h2>
    <h3 class="text-base text-blue-400">{{  text }} </h3>

  </div>
</template>
