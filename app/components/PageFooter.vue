<script setup lang="ts">
import { type Ref, inject } from 'vue'

const isMd = inject<Ref<boolean>>('isMd')
const getIsMd = computed(():boolean =>  isMd?.value ?? false)
const screenIcon = computed(() => getIsMd.value ? 'i-heroicons-computer-desktop' : 'i-heroicons-device-phone-mobile')
</script>

<template>
  <UContainer>
    <footer class="flex flex-row items-start justify-between text-xstext-amber-100 p-4 border-t-amber-100">
      <span>Theslope v {{ $config.public.COMMIT_ID?.substring(0, 7) }}</span>
      <span>Created with  🦄 & 🌈</span>
      <span>Copyright @themathmagician  @2025 </span>
      <span><Icon :name="screenIcon" size="lg" class="ml-auto"/></span>
    </footer>
  </UContainer>
</template>
