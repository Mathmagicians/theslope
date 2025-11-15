<script setup lang="ts">
import { type Ref, inject } from 'vue'

const isMd = inject<Ref<boolean>>('isMd')
const getIsMd = computed(():boolean =>  isMd?.value ?? false)
const screenIcon = computed(() => getIsMd.value ? 'i-heroicons-computer-desktop' : 'i-heroicons-device-phone-mobile')

// Use design system for consistent styling
const { LAYOUTS, TYPOGRAPHY } = useColorSystem()
</script>

<template>
  <UContainer>
    <footer :class="LAYOUTS.footer">
      <span :class="TYPOGRAPHY.footerText">Theslope v {{ $config.public.COMMIT_ID?.substring(0, 7) }}</span>
      <span :class="TYPOGRAPHY.footerText">Created with  🦄 & 🌈</span>
      <span :class="TYPOGRAPHY.footerText">Copyright @themathmagician  @2025 </span>
      <span :class="TYPOGRAPHY.footerText"><Icon :name="screenIcon" size="lg" class="ml-auto"/></span>
    </footer>
  </UContainer>
</template>
