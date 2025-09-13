<script setup lang="ts">
import type { Ref } from 'vue'

useHead({
  title: 'Theslope',
  meta: [
    {name: 'Running community dinners', content: 'This is a little open source community project, developed to facilitate community dinners'}
  ]
})

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
  <div
      class="min-h-screen w-full
  font-sans flex flex-col bg-amber-500 dark:bg-amber-800 space-y-1 ">
    <PageHeader class="my-2"/>
    <slot/>
    <ClientOnly>
      <UNotifications />
    </ClientOnly>
    <PageFooter/>
    <div id="breakpoint-md" class="hidden md:block w-0 h-0"></div>
  </div>
</template>
