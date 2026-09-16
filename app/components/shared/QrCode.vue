<!--
QrCode - a QR code encoded at render time and drawn inline, with no image service

┌──────────┐
│ ▩▩▩  ▩▩▩ │   one <path> of 1x1 module rects over a white <rect>
│ ▩  ▩▩  ▩ │   viewBox counts modules, width/height carry the `size` prop
│ ▩▩▩  ▩▩▩ │   black and white are literal, so print-color-adjust keeps it on paper
└──────────┘

The caption around it and the place it sits belong to the page that mounts it.
-->
<script setup lang="ts">
const props = withDefaults(defineProps<{
  value: string
  /** Rendered edge in pixels */
  size?: number
  /** What the code is for, read out before the encoded value */
  label?: string
}>(), {
  size: 160,
  label: undefined
})

const qr = computed(() => encodeQrPath(props.value))

// A QR pattern says nothing to a screen reader, so the label carries what it encodes
const ariaLabel = computed(() => [props.label, props.value].filter(Boolean).join(': '))
</script>

<template>
  <svg
      :viewBox="`0 0 ${qr.size} ${qr.size}`"
      :width="size"
      :height="size"
      role="img"
      :aria-label="ariaLabel"
      shape-rendering="crispEdges"
      data-testid="qr-code"
  >
    <rect width="100%" height="100%" fill="#ffffff"/>
    <path :d="qr.d" fill="#000000"/>
  </svg>
</template>
