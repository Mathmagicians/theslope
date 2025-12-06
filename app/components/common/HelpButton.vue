<script setup lang="ts">
import { HELP_TEXTS } from '~/config/help-texts'

const route = useRoute()
const isOpen = ref(false)
const doClose = () => isOpen.value = false

const { NAVIGATION, ICONS } = useTheSlopeDesignSystem()
// Dynamically lookup help content based on current route
const helpContent = computed(() => {
  const pathSegments = route.path.split('/').filter(Boolean)

  // Handle root path - look for 'index' key
  if (pathSegments.length === 0) {
    const indexContent = HELP_TEXTS.index
    return indexContent?.title && indexContent?.content ? indexContent : null
  }

  // Get all param values to identify dynamic segments
  const paramValues = Object.values(route.params).flat()

  // Traverse HELP_TEXTS using path segments, skipping dynamic params
  let current: Record<string, unknown> = HELP_TEXTS
  for (const segment of pathSegments) {
    // Skip dynamic param values (e.g., shortname like 'abc-123')
    if (paramValues.includes(segment) && !current[segment]) {
      continue
    }

    if (current[segment]) {
      current = current[segment] as Record<string, unknown>
    } else {
      return null
    }
  }
  return current?.title && current?.content ? current : null
})

// Close help when route changes
watch(() => route.path, () => {
  doClose()
})
</script>

<template>
  <UPopover
      v-if="helpContent"
      v-model:open="isOpen"
      :popper="{ placement: 'bottom-start' }"
  >
    <UButton
        :icon="ICONS.help"
        :color="isOpen ? NAVIGATION.link.activeColor : NAVIGATION.link.color"
        :variant="isOpen ? NAVIGATION.link.activeVariant : NAVIGATION.link.variant"
    />

    <template #content>
      <UCard class="cursor-pointer" variant="outline" @click="doClose()">
        <template #header>
          <div class="flex justify-between items-center">
            <span class="text-sm font-semibold">{{ helpContent.title }}</span>
            <UButton
                :icon="ICONS.xMark"
                variant="ghost"
                size="xs"
                @click="doClose()"
            />
          </div>
        </template>
        <p class="text-sm">{{ helpContent.content }}</p>
      </UCard>
    </template>
  </UPopover>
</template>
