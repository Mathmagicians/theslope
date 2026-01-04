<script setup lang="ts">
/**
 * DangerButton - GitHub-style 2-step confirmation for destructive actions
 *
 * Visual states:
 * 1. Initial: neutral/outline with xMark icon
 * 2. Confirm: error/solid with dangerConfirm icon + countdown fade
 * 3. Loading: disabled with "i gang..." text
 *
 * Features:
 * - Click-outside resets to initial state
 * - Auto-reset timeout with visual countdown (opacity fade)
 * - Configurable colors for hero contexts
 */
import type { NuxtUIColor } from '~/composables/useTheSlopeDesignSystem'
import type { ButtonProps } from '@nuxt/ui'

const { ICONS, SIZES } = useTheSlopeDesignSystem()

type ButtonSize = ButtonProps['size']
type ButtonVariant = ButtonProps['variant']

interface Props {
  /** Initial button text (e.g., "Slet", "Aflys") */
  label: string
  /** Confirm text - defaults to "Tryk igen for at {label.toLowerCase()}..." */
  confirmLabel?: string
  /** Loading text - defaults to "{Label} i gang..." */
  loadingLabel?: string
  /** External loading state (parent owns API call) */
  loading?: boolean
  /** Disable entire button */
  disabled?: boolean
  /** Auto-reset timeout in ms (default: 5000, 0 = disabled) */
  autoResetMs?: number
  /** Button size from design system */
  size?: ButtonSize
  /** Initial icon (default: xMark) */
  icon?: string
  /** Confirm icon (default: dangerConfirm) */
  confirmIcon?: string
  /** Initial color for hero contexts (default: neutral) */
  initialColor?: NuxtUIColor
  /** Initial variant (default: outline) */
  initialVariant?: ButtonVariant
}

const props = withDefaults(defineProps<Props>(), {
  confirmLabel: 'Er du sikker? Tryk igen for at bekræfte',
  loadingLabel: 'Arbejder...',
  loading: false,
  disabled: false,
  autoResetMs: 10000,
  initialColor: 'neutral',
  initialVariant: 'outline'
})

// Defaults from design system (can't use in withDefaults as they're runtime values)
const effectiveSize = computed(() => props.size ?? SIZES.standard)
const effectiveIcon = computed(() => props.icon ?? ICONS.xMark)
const effectiveConfirmIcon = computed(() => props.confirmIcon ?? ICONS.dangerConfirm)
const trailingIcon = computed(() => isConfirmMode.value && !props.loading ? ICONS.arrowRight : undefined)

const emit = defineEmits<{
  confirm: []
}>()

// State
const isConfirmMode = ref(false)
const buttonRef = ref<HTMLElement | null>(null)
const countdownProgress = ref(100) // 100% = full opacity, 0% = faded

// Display computeds
const displayText = computed(() => {
  if (props.loading) return props.loadingLabel
  if (isConfirmMode.value) return props.confirmLabel
  return props.label
})

const displayIcon = computed(() => {
  if (props.loading) return undefined // UButton shows spinner when loading
  return isConfirmMode.value ? effectiveConfirmIcon.value : effectiveIcon.value
})

const displayColor = computed<NuxtUIColor>(() =>
  isConfirmMode.value || props.loading ? 'error' : props.initialColor
)

const displayVariant = computed<ButtonVariant>(() =>
  isConfirmMode.value || props.loading ? 'solid' : props.initialVariant
)

// Gradient wipe: error color shrinks from left as countdown progresses
const countdownGradient = computed(() => {
  if (!isConfirmMode.value || props.loading) return {}
  const redPercent = countdownProgress.value
  return {
    background: `linear-gradient(to right, var(--color-red-900) ${redPercent}%, var(--color-red-400) ${redPercent}%)`
  }
})

// Timeout handling
let resetTimeout: ReturnType<typeof setTimeout> | null = null
let countdownInterval: ReturnType<typeof setInterval> | null = null

const startCountdown = () => {
  if (props.autoResetMs <= 0) return

  countdownProgress.value = 100
  const stepMs = 50 // Update every 50ms for smooth animation
  const steps = props.autoResetMs / stepMs
  const decrement = 100 / steps

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

// Click handler
const handleClick = () => {
  if (props.disabled || props.loading) return

  if (isConfirmMode.value) {
    // Second click - emit confirm and reset
    emit('confirm')
    resetToInitial()
  } else {
    // First click - enter confirm mode
    isConfirmMode.value = true
    startCountdown()
  }
}

// Click-outside detection
const handleClickOutside = (event: MouseEvent) => {
  if (isConfirmMode.value && buttonRef.value && !buttonRef.value.contains(event.target as Node)) {
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

// Reset countdown when loading starts
watch(() => props.loading, (newLoading) => {
  if (newLoading) {
    clearCountdown()
  }
})
</script>

<template>
  <div ref="buttonRef" class="inline-block">
    <UButton
      :color="displayColor"
      :variant="displayVariant"
      :size="effectiveSize"
      :icon="displayIcon"
      :trailing-icon="trailingIcon"
      :disabled="disabled || loading"
      :loading="loading"
      :style="countdownGradient"
      :class="isConfirmMode && !loading ? 'ring-2 ring-red-500 text-white' : ''"
      @click="handleClick"
    >
      {{ displayText }}
    </UButton>
  </div>
</template>
