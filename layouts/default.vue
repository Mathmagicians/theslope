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
  isMd.value = document.getElementById('breakpoint-md')?.offsetParent ? true: false
  console.log('📺 > LAYOUT > isMd', isMd.value)
}

onMounted(() => {
  checkMdBreakpoint(); // Initial check
  window.addEventListener('resize', checkMdBreakpoint);
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMdBreakpoint);
})

provide('isMd', isMd) //exposes the reactive variable to all children - it detects tailwind breakpoint md
</script>

<template>
  <div
      class="w-screen min-w-screen h-full
  font-sans flex flex-col bg-white dark:bg-slate-900">
    <PageHeader/>
    <slot/>
    <PageFooter/>
    <div id="breakpoint-md" class="hidden md:block w-0 h-0"></div>
  </div>
</template>
