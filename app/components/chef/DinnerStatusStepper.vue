<script setup lang="ts">
/**
 * DinnerStatusStepper - Dinner preparation progress stepper
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * STEP → BADGE INTEGRATION
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 *  ●━━━━━━━━━━━━○━━━━━━━━━━━━○━━━━━━━━━━━━○━━━━━━━━━━━━○
 *  │            │            │            │            │
 *  Planlagt     Annonceret   Tilmelding   Indkøb       Afholdt
 *  │            │            lukket       klar         │
 *  │            │            │            │            │
 *  (no badge)   [⚠️ om 2d]   [✅ Åben]    (future)     │
 *               Menu         Tilmelding                │
 *               deadline     status                    │
 *
 * Badges are rendered UNDER each step using DinnerDeadlineBadges data.
 * The badge belongs to the step it leads TO (the goal), not the current step.
 *
 * ADR Compliance:
 * - ADR-001: Business logic in useBooking composable (DINNER_STEP_MAP, getStepConfig)
 * - Mobile-first responsive design
 * - Uses NuxtUI UStepper component
 * - Uses DinnerDeadlineBadges for shared deadline logic
 */
import type { DinnerEventDisplay } from '~/composables/useBookingValidation'
import type { DeadlineBadge } from '~/components/chef/DinnerDeadlineBadges.vue'
import DinnerDeadlineBadges from '~/components/chef/DinnerDeadlineBadges.vue'
import { DINNER_STEP_MAP } from '~/composables/useBooking'

interface Props {
  dinnerEvent: DinnerEventDisplay
  mode?: 'compact' | 'full'
  showDeadlines?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'compact',
  showDeadlines: true
})

// Design system
const { COLOR, SIZES, ORIENTATIONS, TYPOGRAPHY } = useTheSlopeDesignSystem()

// Business logic from useBooking
const { getStepConfig, getStepDeadline } = useBooking()
const { DinnerStateSchema } = useBookingValidation()
const DinnerState = DinnerStateSchema.enum

// Template ref for DinnerDeadlineBadges to get badge data
const deadlineBadgesRef = ref<InstanceType<typeof DinnerDeadlineBadges> | null>(null)

// Current step and deadline
const currentStepConfig = computed(() => getStepConfig(props.dinnerEvent))
const currentStep = computed(() => currentStepConfig.value.step)
const currentDeadline = computed(() => getStepDeadline(props.dinnerEvent))

// Is cancelled?
const isCancelled = computed(() => props.dinnerEvent.state === DinnerState.CANCELLED)

// Get badge for a specific step (from DinnerDeadlineBadges via ref)
const getBadgeForStep = (step: number): DeadlineBadge | null => {
  return deadlineBadgesRef.value?.getBadgeForStep(step) ?? null
}

// Build stepper items from DINNER_STEP_MAP with slot names for custom rendering
const steps = computed(() => {
  const step = currentStep.value
  const deadline = currentDeadline.value

  return Object.values(DINNER_STEP_MAP).map((config) => ({
    slot: `step-${config.step}` as const,
    title: config.title,
    description: config.step === step && props.showDeadlines ? deadline.description : config.text,
    icon: config.icon,
    disabled: config.step > step
  }))
})
</script>

<template>
  <div>
    <!-- Hidden data provider for deadline badges -->
    <DinnerDeadlineBadges
      ref="deadlineBadgesRef"
      :dinner-event="dinnerEvent"
      mode="stepper"
    />

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

    <!-- Normal: Steps progress with integrated deadline badges -->
    <UStepper
      v-else
      :model-value="currentStep"
      :items="steps"
      :size="SIZES.small"
      :orientation="ORIENTATIONS.responsive.value"
      :color="COLOR.primary"
    >
      <!-- Step 1 (Annonceret): Menu deadline badge -->
      <template #step-1>
        <div v-if="getBadgeForStep(1)" class="mt-1">
          <UBadge
            :color="getBadgeForStep(1)!.color"
            variant="soft"
            :size="SIZES.small"
          >
            {{ getBadgeForStep(1)!.value }}
          </UBadge>
          <p v-if="mode === 'full'" :class="TYPOGRAPHY.bodyTextMuted">
            {{ getBadgeForStep(1)!.helpText }}
          </p>
        </div>
      </template>

      <!-- Step 2 (Tilmelding lukket): Tilmelding status badge -->
      <template #step-2>
        <div v-if="getBadgeForStep(2)" class="mt-1">
          <UBadge
            :color="getBadgeForStep(2)!.color"
            variant="soft"
            :size="SIZES.small"
          >
            {{ getBadgeForStep(2)!.value }}
          </UBadge>
          <p v-if="mode === 'full'" :class="TYPOGRAPHY.bodyTextMuted">
            {{ getBadgeForStep(2)!.helpText }}
          </p>
        </div>
      </template>
    </UStepper>
  </div>
</template>
