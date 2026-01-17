<script setup lang="ts">
/**
 * PageFooter - Site footer with links and info
 *
 * Features:
 * - Version information
 * - GitHub link
 * - Color mode toggle
 * - Copyright info
 * - Screen size indicator
 */
import {type Ref, inject} from 'vue'

const isMd = inject<Ref<boolean>>('isMd')
const getIsMd = computed((): boolean => isMd?.value ?? false)
const screenIcon = computed(() => getIsMd.value ? 'i-heroicons-computer-desktop' : 'i-heroicons-device-phone-mobile')

// Use design system for consistent styling
const { TYPOGRAPHY, ICONS } = useTheSlopeDesignSystem()

</script>

<template>
  <UFooter>
    <template #left>
      <span :class="TYPOGRAPHY.footerText">Copyright @themathmagician  @2025 </span>
    </template>
    <div :class="`flex flex-col md:flex-row items-center justify-between gap-4 py-4`">
      <span :class="TYPOGRAPHY.footerText">
        Theslope {{ $config.public.RELEASE_VERSION || `v${$config.public.COMMIT_ID?.substring(0, 7)}` }}
        <span v-if="$config.public.RELEASE_DATE"> · {{ $config.public.RELEASE_DATE }}</span>
      </span>
      <span :class="TYPOGRAPHY.footerText">Created with  🦄 & 🌈</span>
    </div>

    <template #right>
      <UButton
          variant="ghost"
          :icon="screenIcon"
          aria-label="Screen size indicator"
          disabled
          :ui="{ leadingIcon: TYPOGRAPHY.footerText }"
      />

      <UColorModeButton :ui="{ leadingIcon: TYPOGRAPHY.footerText }" />

      <UTooltip text="Open source project on Github">
        <UButton
            variant="ghost"
            to="https://github.com/Mathmagicians/theslope"
            target="_blank"
            :icon="ICONS.github"
            aria-label="GitHub"
            :ui="{ leadingIcon: TYPOGRAPHY.footerText }"
        />
      </UTooltip>
    </template>
  </UFooter>
</template>
