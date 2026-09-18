<script setup lang="ts">
import type { Ref } from 'vue'

const authStore = useAuthStore()

// The user's appearance reaches every page through <html>: data-palette selects a palette preset
// (app/assets/css/palettes), data-text-scale the root font size (main.css). The defaults resolve to
// undefined, which unhead renders as no attribute at all, and SSR writes them, so a reload never
// flashes the published palette first.
const paletteAttr = computed(() => authStore.appearance.palette === 'default' ? undefined : authStore.appearance.palette)
const textScaleAttr = computed(() => authStore.appearance.textScale === 'normal' ? undefined : authStore.appearance.textScale)

useHead({
  title: 'Theslope',
  htmlAttrs: {
    'data-palette': paletteAttr,
    'data-text-scale': textScaleAttr
  },
  meta: [
    {name: 'Running community dinners', content: 'This is a little open source community project, developed to facilitate community dinners'}
  ]
})

const {BACKGROUNDS} = useTheSlopeDesignSystem()

const isMd: Ref<boolean> = ref(false)
const checkMdBreakpoint = () => {
  if (import.meta.client) {
    isMd.value = !!document.getElementById('breakpoint-md')?.offsetParent
    console.log('📺 > LAYOUT > isMd', isMd.value)
  }
}

onMounted(() => {
  checkMdBreakpoint(); // Initial check
  if (import.meta.client) {
    window.addEventListener('resize', checkMdBreakpoint);
  }
})

onUnmounted(() => {
  if (import.meta.client) {
    window.removeEventListener('resize', checkMdBreakpoint);
  }
})

provide('isMd', isMd) //exposes the reactive variable to all children - it detects tailwind breakpoint md
</script>

<template>
  <div :class="['min-h-screen w-full font-sans flex flex-col space-y-1', BACKGROUNDS.appShell]">
    <PageHeader class="my-2 flex-shrink-0"/>
    <div class="flex-grow">
      <slot/>
    </div>
    <ClientOnly>
      <UToaster />
    </ClientOnly>
    <PageFooter class="flex-shrink-0"/>
    <div id="breakpoint-md" class="hidden md:block w-0 h-0"/>
  </div>
</template>
