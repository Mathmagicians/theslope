<script setup lang="ts">
defineProps<{
  text: string
}>()
</script>

<template>
  <UTooltip :text="text">
    <UButton
        icon="i-heroicons-question-mark-circle"
        variant="ghost"
        color="gray"
        size="md"
        class="mx-2 p-2 size-8"
    />
  </UTooltip>
</template>
