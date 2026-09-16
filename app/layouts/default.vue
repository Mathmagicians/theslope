<script setup lang="ts">
import type { Ref } from 'vue'

useHead({
  title: 'Theslope',
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
