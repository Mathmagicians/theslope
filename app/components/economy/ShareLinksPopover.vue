<script setup lang="ts">
/**
 * ShareLinksPopover - Share actions for billing period
 *
 * Two buttons:
 * 1. External link - direct navigation to public page (optional)
 * 2. Share - popover with copyable links (public page + CSV)
 *
 * Visual check: /admin/economy, the small buttons and the open popover; /public/billing/[token], the prominent button; phone and desktop.
 */
import {BOOKING_WORDS} from '~/config/bookingWords'

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

const {ICONS, SIZES, COLOR, NOISE, COMPONENTS} = useTheSlopeDesignSystem()
const share = COMPONENTS.shareLinks
const WORDS = BOOKING_WORDS.billing.shareLinks

// Compute base URL lazily - useRequestURL is SSR-safe
const baseUrl = computed(() => useRequestURL().origin)
const getShareUrl = () => `${baseUrl.value}/public/billing/${props.shareToken}`
const getCsvUrl = () => `${baseUrl.value}/api/public/billing/${props.shareToken}/csv`

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
  <div :class="share.actions">
    <a
        v-if="!hideExternalLink"
        :href="getShareUrl()"
        target="_blank"
        rel="noopener"
        @click.stop
    >
      <UButton
          :color="COLOR.neutral"
          :variant="NOISE.quiet"
          :icon="ICONS.externalLink"
          :size="SIZES.small"
          :aria-label="WORDS.openPublicPage"
      />
    </a>
    <UPopover>
      <UButton
          :color="prominent ? COLOR.primary : COLOR.neutral"
          :variant="prominent ? NOISE.loud : NOISE.quiet"
          :icon="ICONS.share"
          :size="prominent ? SIZES.standard : SIZES.small"
          :aria-label="WORDS.share"
          @click.stop
      >
        <template v-if="prominent">{{ WORDS.shareProminent }}</template>
      </UButton>
      <template #content>
        <div :class="share.panel">
          <div v-if="!hideExternalLink">
            <p :class="share.linkLabel">{{ WORDS.publicPage }}</p>
            <div :class="share.linkRow">
              <UInput
                  :model-value="getShareUrl()"
                  readonly
                  :class="share.linkInput"
                  :size="SIZES.small"
              />
              <UButton
                  :color="linkCopied ? COLOR.success : COLOR.primary"
                  :icon="linkCopied ? ICONS.check : ICONS.clipboard"
                  :size="SIZES.small"
                  @click="copyLink"
              />
            </div>
          </div>
          <div>
            <p :class="share.linkLabel">{{ WORDS.csv }}</p>
            <div :class="share.linkRow">
              <UInput
                  :model-value="getCsvUrl()"
                  readonly
                  :class="share.linkInput"
                  :size="SIZES.small"
              />
              <UButton
                  :color="csvLinkCopied ? COLOR.success : COLOR.primary"
                  :icon="csvLinkCopied ? ICONS.check : ICONS.clipboard"
                  :size="SIZES.small"
                  @click="copyCsvLink"
              />
            </div>
          </div>
        </div>
      </template>
    </UPopover>
  </div>
</template>
