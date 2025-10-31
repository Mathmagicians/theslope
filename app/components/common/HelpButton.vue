<script setup lang="ts">
import { HELP_TEXTS } from '~/config/help-texts'

const route = useRoute()
const isOpen = ref(false)

// Dynamically lookup help content based on current route
const helpContent = computed(() => {
  const pathSegments = route.path.split('/').filter(Boolean)
  if (pathSegments.length === 0) return null

  // Traverse HELP_TEXTS using path segments
  let current: any = HELP_TEXTS
  for (const segment of pathSegments) {
    if (current[segment]) {
      current = current[segment]
    } else {
      return null
    }
  }
  return current?.title && current?.content ? current : null
})

// Close help when route changes
watch(() => route.path, () => {
  isOpen.value = false
})
</script>

<template>
  <UCollapsible v-if="helpContent" v-model="isOpen">
      <UTooltip :text="helpContent.title">
        <UButton
            icon="i-heroicons-question-mark-circle"
            variant="soft"
            color="tertiary"
            size="xl"
        />
      </UTooltip>
    <template #content>
      <UCard class="mt-2 w-80" @click="isOpen = false">
        <template #header>
          <span class="text-sm font-semibold">{{ helpContent.title }}</span>
        </template>
        <p class="text-sm">{{ helpContent.content }}</p>
      </UCard>
    </template>
  </UCollapsible>
</template>
