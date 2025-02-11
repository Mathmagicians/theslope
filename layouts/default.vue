<script setup lang="ts">
useHead({
  title: 'Theslope',
  meta: [
    { name: 'Running community dinners', content: 'This is a little open source community project, developed to facilitate community dinners' }
  ]
})
</script>
<template>
  <div
class="w-full min-w-screen h-full
  font-sans flex flex-col bg-white">
    <PageHeader/>
    <slot/>
    <PageFooter/>
  </div>
</template>
