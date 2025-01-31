<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps({
  error: Object as () => NuxtError
})
</script>

<template>
  <div class="bg-white">
    <ViewError :error="props.error.statusCode" :message="props.error.message" />
  </div>

</template>
