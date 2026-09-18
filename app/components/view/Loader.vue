<script setup lang="ts">
defineProps<{ text?: string }>()
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
      <USkeleton class="h-12 w-12 shrink-0 rounded-full" />

      <!-- The bars are at most 250/200px wide and shrink with the card -->
      <div class="grid flex-1 min-w-0 gap-2">
        <USkeleton class="h-4 w-full max-w-[250px]" />
        <USkeleton class="h-4 w-full max-w-[200px]" />
      </div>
    </div>
  </UCard>
</template>
