<template>
  <UApp>
    <NuxtLayout>
      <!-- Use route.path (not fullPath) to prevent component remount on query param changes -->
      <!-- See: https://github.com/nuxt/nuxt/discussions/24062 -->
      <NuxtPage :page-key="route => route.path" />
    </NuxtLayout>
  </UApp>
</template>
<script setup lang="ts">
</script>
