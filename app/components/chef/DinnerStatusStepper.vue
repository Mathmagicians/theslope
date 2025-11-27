<script setup lang="ts">
/**
 * DinnerStatusStepper - Dinner preparation progress stepper
 *
 * Uses DINNER_STEP_MAP from useBooking for step config and deadline descriptions.
 * Shows 5 steps with countdown-based descriptions for deadline awareness.
 *
 * ADR Compliance:
 * - ADR-001: Business logic in useBooking composable (DINNER_STEP_MAP, getStepConfig)
 * - Mobile-first responsive design
 * - Uses NuxtUI UStepper component
 */
import type { DinnerEventDisplay } from '~/composables/useBookingValidation'
import { DINNER_STEP_MAP } from '~/composables/useBooking'

interface Props {
  dinnerEvent: Pick<DinnerEventDisplay, 'state' | 'date' | 'totalCost'>
  mode?: 'compact' | 'full'
  showDeadlines?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'compact',
  showDeadlines: false
})

// Design system
const { COLOR } = useTheSlopeDesignSystem()

// Business logic from useBooking
const { getStepConfig, getStepDeadline } = useBooking()
const { DinnerStateSchema } = useBookingValidation()
const DinnerState = DinnerStateSchema.enum

// Current step and deadline
const currentStepConfig = computed(() => getStepConfig(props.dinnerEvent))
const currentStep = computed(() => currentStepConfig.value.step)
const currentDeadline = computed(() => getStepDeadline(props.dinnerEvent))

// Is cancelled?
const isCancelled = computed(() => props.dinnerEvent.state === DinnerState.CANCELLED)

// Build stepper items from DINNER_STEP_MAP
const steps = computed(() => {
  const step = currentStep.value
  const deadline = currentDeadline.value

  return Object.values(DINNER_STEP_MAP).map((config) => ({
    title: config.title,
    description: config.step === step && props.showDeadlines ? deadline.description : config.text,
    icon: config.icon,
    disabled: config.step > step
  }))
})
</script>

<template>
  <div>
    <!-- Cancelled: Empty state -->
    <UAlert
      v-if="isCancelled"
      :color="COLOR.error"
      variant="soft"
      icon="i-heroicons-x-circle"
    >
      <template #title>
        Aflyst
      </template>
      <template #description>
        Fællesspisningen er aflyst
      </template>
    </UAlert>

    <!-- Normal: Steps progress -->
    <UStepper
      v-else
      :model-value="currentStep"
      :items="steps"
      :size="mode === 'compact' ? 'sm' : 'md'"
      :orientation="mode === 'compact' ? 'horizontal' : 'vertical'"
    />
  </div>
</template>
