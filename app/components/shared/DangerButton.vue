<script setup lang="ts">
/**
 * DangerButton - two-click confirmation for a destructive action or its undo
 *
 * The first click arms the button: it turns loud in its mode's colour, and a countdown wipe shrinks the strong colour
 * off the pale one until the button disarms. The second click confirms; a click outside or the timeout disarms
 * without confirming. While the parent's action runs, the button shows the busy label.
 *
 * Visual check: the danger zone on /chef (cancel the dinner, and undo the cancellation), phone and desktop, light and
 * dark: armed, the label reads on both colours of the wipe while the wipe shrinks to the right edge.
 */
import { COLOR, NOISE, type NuxtUIButtonVariant, type NuxtUIColor, type NuxtUISize } from '~/composables/useTheSlopeDesignSystem'
import { BUTTON_WORDS } from '~/config/buttonWords'

const { ICONS, SIZES, COMPONENTS } = useTheSlopeDesignSystem()

interface Props {
  label: string
  confirmLabel?: string
  loadingLabel?: string
  /** The parent owns the action and reports it running */
  loading?: boolean
  disabled?: boolean
  /** Time until an armed button disarms; 0 keeps it armed */
  autoResetMs?: number
  size?: NuxtUISize
  icon?: string
  confirmIcon?: string
  /** The unarmed colour, for a button on a hero fill */
  initialColor?: NuxtUIColor
  initialVariant?: NuxtUIButtonVariant
  /** Restores what a destructive action took: the success face instead of the error one */
  undo?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  confirmLabel: BUTTON_WORDS.confirmAgain,
  loadingLabel: BUTTON_WORDS.working,
  loading: false,
  disabled: false,
  autoResetMs: 10000,
  size: undefined,
  icon: undefined,
  confirmIcon: undefined,
  initialColor: COLOR.neutral,
  initialVariant: NOISE.medium,
  undo: false
})

// The design system comes from a composable call, which withDefaults cannot reference
const effectiveSize = computed(() => props.size ?? SIZES.standard)
const effectiveIcon = computed(() => props.icon ?? ICONS.xMark)
const effectiveConfirmIcon = computed(() => props.confirmIcon ?? ICONS.dangerConfirm)
const trailingIcon = computed(() => isConfirmMode.value && !props.loading ? ICONS.arrowRight : undefined)

const emit = defineEmits<{
  confirm: []
}>()

const isConfirmMode = ref(false)
const buttonRef = ref<HTMLElement | null>(null)
// Where the strong colour ends, in percent of the button's width
const countdownProgress = ref(100)

const displayText = computed(() => {
  if (props.loading) return props.loadingLabel
  if (isConfirmMode.value) return props.confirmLabel
  return props.label
})

const displayIcon = computed(() => {
  if (props.loading) return undefined // UButton shows its spinner
  return isConfirmMode.value ? effectiveConfirmIcon.value : effectiveIcon.value
})

const face = computed(() => props.undo ? COMPONENTS.dangerButton.undo : COMPONENTS.dangerButton.danger)

const displayColor = computed<NuxtUIColor>(() =>
  isConfirmMode.value || props.loading ? face.value.color : props.initialColor
)

const displayVariant = computed<NuxtUIButtonVariant>(() =>
  isConfirmMode.value || props.loading ? NOISE.loud : props.initialVariant
)

const isArmed = computed(() => isConfirmMode.value && !props.loading)
const armedClasses = computed(() => isArmed.value ? [face.value.armed, face.value.countdown] : [])
const wipeStyle = computed(() => isArmed.value ? {[COMPONENTS.dangerButton.wipePosition]: `${countdownProgress.value}%`} : {})

let resetTimeout: ReturnType<typeof setTimeout> | null = null
let countdownInterval: ReturnType<typeof setInterval> | null = null

const startCountdown = () => {
  if (props.autoResetMs <= 0) return

  countdownProgress.value = 100
  const stepMs = 50
  const decrement = 100 / (props.autoResetMs / stepMs)

  countdownInterval = setInterval(() => {
    countdownProgress.value = Math.max(0, countdownProgress.value - decrement)
  }, stepMs)

  resetTimeout = setTimeout(() => {
    resetToInitial()
  }, props.autoResetMs)
}

const clearCountdown = () => {
  if (resetTimeout) {
    clearTimeout(resetTimeout)
    resetTimeout = null
  }
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
  countdownProgress.value = 100
}

const resetToInitial = () => {
  isConfirmMode.value = false
  clearCountdown()
}

const handleClick = () => {
  if (props.disabled || props.loading) return

  if (isConfirmMode.value) {
    emit('confirm')
    resetToInitial()
  } else {
    isConfirmMode.value = true
    startCountdown()
  }
}

const handleClickOutside = (event: MouseEvent) => {
  if (isConfirmMode.value && buttonRef.value && !(event.target instanceof Node && buttonRef.value.contains(event.target))) {
    resetToInitial()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  clearCountdown()
})

watch(() => props.loading, (newLoading) => {
  if (newLoading) {
    clearCountdown()
  }
})
</script>

<template>
  <div ref="buttonRef" :class="COMPONENTS.dangerButton.root">
    <UButton
      block
      :color="displayColor"
      :variant="displayVariant"
      :size="effectiveSize"
      :icon="displayIcon"
      :trailing-icon="trailingIcon"
      :disabled="disabled || loading"
      :loading="loading"
      :style="wipeStyle"
      :class="armedClasses"
      @click="handleClick"
    >
      {{ displayText }}
    </UButton>
  </div>
</template>
