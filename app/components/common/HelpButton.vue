<script setup lang="ts">
import { HELP_TEXTS } from '~/config/help-texts'

const route = useRoute()
const isOpen = ref(false)
const close = () => isOpen.value = false
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
  close()
})
</script>

<template>
  <UPopover
      v-if="helpContent"
      v-model:open="isOpen"
      :popper="{ placement: 'bottom-start' }"
  >
    <UButton
        icon="i-heroicons-question-mark-circle"
        variant="solid"
        color="ocean"
        size="xl"
    />

    <template #content="{ close }">
      <UCard class="w-1/3 cursor-pointer" @click="close" variant="outline">
        <template #header>
          <div class="flex justify-between items-center">
            <span class="text-sm font-semibold">{{ helpContent.title }}</span>
            <UButton
                icon="i-heroicons-x-mark"
                variant="ghost"
                size="xs"
            />
          </div>
        </template>
        <p class="text-sm">{{ helpContent.content }}</p>
      </UCard>
    </template>
  </UPopover>
</template>
