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
// Use design system for consistent styling
const { TYPOGRAPHY, ICONS, RESPONSIVE_ICONS, NOISE, COMPONENTS } = useTheSlopeDesignSystem()

</script>

<template>
  <UFooter>
    <template #left>
      <span :class="TYPOGRAPHY.footerText">Copyright @themathmagician  @2025 </span>
    </template>
    <div :class="COMPONENTS.pageFooter.row">
      <span :class="TYPOGRAPHY.footerText">
        Theslope {{ $config.public.RELEASE_VERSION || `v${$config.public.COMMIT_ID?.substring(0, 7)}` }}
        <span v-if="$config.public.RELEASE_DATE"> · {{ $config.public.RELEASE_DATE }}</span>
      </span>
      <span :class="TYPOGRAPHY.footerText">Created with  🦄 & 🌈</span>
    </div>

    <template #right>
      <UButton
          :variant="NOISE.quiet"
          :icon="RESPONSIVE_ICONS.screen"
          aria-label="Screen size indicator"
          disabled
          :ui="COMPONENTS.pageFooter.iconButtonUi"
      />

      <UColorModeButton :ui="COMPONENTS.pageFooter.iconButtonUi" />

      <UTooltip text="Open source project on Github">
        <UButton
            :variant="NOISE.quiet"
            to="https://github.com/Mathmagicians/theslope"
            target="_blank"
            :icon="ICONS.github"
            aria-label="GitHub"
            :ui="COMPONENTS.pageFooter.iconButtonUi"
        />
      </UTooltip>
    </template>
  </UFooter>
</template>
