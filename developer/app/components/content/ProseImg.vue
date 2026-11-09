<script setup lang="ts">
import ProseImgBase from '@nuxt/ui/components/prose/Img.vue'

defineOptions({inheritAttrs: false})

const props = defineProps<{src: string, alt: string}>()

// A doc page lives at /docs/<name>, so a relative image path in docs/*.md resolves under /docs/
const src = computed(() => /^(\/|[a-z][a-z0-9+.-]*:)/i.test(props.src) ? props.src : `/docs/${props.src}`)
// An icon in the text names its size as Iconify's ?height=: it keeps that size in the line and opens no zoom;
// a screenshot fills the column and zooms
const iconSize = computed(() => /[?&]height=(\d+)/.exec(props.src)?.[1])
</script>

<template>
  <ProseImgBase
    v-bind="$attrs"
    :src="src"
    :alt="alt"
    :width="iconSize"
    :height="iconSize"
    :zoom="!iconSize"
    :class="iconSize ? 'inline' : undefined"
  />
</template>
