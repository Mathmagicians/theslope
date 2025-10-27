<script setup lang="ts">
const props = defineProps<{ text?: string }>()
</script>
<template>
  <UCard class="w-full px-0">
    <template #header>
      <h1 class="text-xl">Vi venter på data, vi venter på data ... </h1>
      <h2 class="text-muted">
        {{ text }}
      </h2>
    </template>
    <div class="flex items-center gap-4">
      <USkeleton class="h-12 w-12 rounded-full" />

      <div class="grid gap-2">
        <USkeleton class="h-4 w-[250px]" />
        <USkeleton class="h-4 w-[200px]" />
      </div>
    </div>
  </UCard>
</template>
