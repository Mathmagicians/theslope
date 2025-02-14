<script setup lang="ts">
import { type Ref, inject } from 'vue'

const isMd = inject<Ref<boolean>>('isMd')
const getIsMd = computed(():boolean =>  isMd?.value ?? false)
const screenIcon = computed(() => getIsMd.value ? 'i-heroicons-computer-desktop' : 'i-heroicons-device-phone-mobile')
</script>

<template>
  <footer class="flex flex-row items-center justify-between text-xs text-gray-600 p-4 border-t-2">
    <span>Created with  🦄 & 🌈</span>
    <span>Copyright @themathmagician  @2025 </span>
    <span><Icon :name="screenIcon" size="lg" class="ml-auto"/></span>
  </footer>
</template>
