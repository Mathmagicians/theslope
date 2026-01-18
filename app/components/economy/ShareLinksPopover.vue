<script setup lang="ts">
/**
 * ShareLinksPopover - Share actions for billing period
 *
 * Two buttons:
 * 1. External link - direct navigation to public page (optional)
 * 2. Share - popover with copyable links (public page + CSV)
 */
interface Props {
    shareToken: string
    /** Hide the external link button (useful when already on public page) */
    hideExternalLink?: boolean
    /** Show larger button with text (for prominent placement) */
    prominent?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    hideExternalLink: false,
    prominent: false
})

const {ICONS, SIZES, TYPOGRAPHY, COLOR} = useTheSlopeDesignSystem()

const getShareUrl = (): string => {
    const baseUrl = window.location.origin
    return `${baseUrl}/public/billing/${props.shareToken}`
}

const getCsvUrl = (): string => {
    const baseUrl = window.location.origin
    return `${baseUrl}/api/public/billing/${props.shareToken}/csv`
}

const linkCopied = ref(false)
const csvLinkCopied = ref(false)

const copyLink = async () => {
    await navigator.clipboard.writeText(getShareUrl())
    linkCopied.value = true
    setTimeout(() => { linkCopied.value = false }, 2000)
}

const copyCsvLink = async () => {
    await navigator.clipboard.writeText(getCsvUrl())
    csvLinkCopied.value = true
    setTimeout(() => { csvLinkCopied.value = false }, 2000)
}
</script>

<template>
  <div class="flex gap-1">
    <!-- Button 1: Direct link to public page (optional) -->
    <UButton
        v-if="!hideExternalLink"
        :to="getShareUrl()"
        target="_blank"
        color="neutral"
        variant="ghost"
        :icon="ICONS.externalLink"
        :size="SIZES.small"
        aria-label="Åbn offentlig side"
        @click.stop
    />
    <!-- Button 2: Popover with copyable links -->
    <UPopover>
      <UButton
          :color="prominent ? COLOR.primary : 'neutral'"
          :variant="prominent ? 'solid' : 'ghost'"
          :icon="ICONS.share"
          :size="prominent ? SIZES.standard : SIZES.small"
          aria-label="Del links"
          @click.stop
      >
        <template v-if="prominent">Del CSV</template>
      </UButton>
      <template #content>
        <div class="p-3 space-y-3 min-w-72">
          <div v-if="!hideExternalLink">
            <p :class="[TYPOGRAPHY.bodyTextMuted, 'mb-1 text-xs']">Offentlig side:</p>
            <div class="flex gap-2">
              <UInput
                  :model-value="getShareUrl()"
                  readonly
                  class="flex-1 font-mono text-xs"
                  size="xs"
              />
              <UButton
                  :color="linkCopied ? COLOR.success : COLOR.primary"
                  :icon="linkCopied ? ICONS.check : ICONS.clipboard"
                  size="xs"
                  @click="copyLink"
              />
            </div>
          </div>
          <div>
            <p :class="[TYPOGRAPHY.bodyTextMuted, 'mb-1 text-xs']">CSV download:</p>
            <div class="flex gap-2">
              <UInput
                  :model-value="getCsvUrl()"
                  readonly
                  class="flex-1 font-mono text-xs"
                  size="xs"
              />
              <UButton
                  :color="csvLinkCopied ? COLOR.success : COLOR.primary"
                  :icon="csvLinkCopied ? ICONS.check : ICONS.clipboard"
                  size="xs"
                  @click="copyCsvLink"
              />
            </div>
          </div>
        </div>
      </template>
    </UPopover>
  </div>
</template>
