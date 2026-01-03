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
import type { SeasonDeadlines } from '~/composables/useSeason'
import DinnerDeadlineBadges from '~/components/chef/DinnerDeadlineBadges.vue'
import { DINNER_STEP_MAP } from '~/composables/useBooking'

interface Props {
  dinnerEvent: DinnerEventDisplay
  deadlines: SeasonDeadlines
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

// Current step and deadline (using season-specific deadlines from props)
const currentStepConfig = computed(() => getStepConfig(props.dinnerEvent, props.deadlines))
const currentStep = computed(() => currentStepConfig.value.step)
const currentDeadline = computed(() => getStepDeadline(props.dinnerEvent, props.deadlines))

// Is cancelled?
const isCancelled = computed(() => props.dinnerEvent.state === DinnerState.CANCELLED)

// Is past/consumed event? (no badges shown for past events, like in dinner card view)
const isPastEvent = computed(() => props.dinnerEvent.state === DinnerState.CONSUMED)

// Get badge for a specific step (from DinnerDeadlineBadges via ref)
const getBadgeForStep = (step: number): DeadlineBadge | null => {
  return deadlineBadgesRef.value?.getBadgeForStep(step) ?? null
}

// Build stepper items from DINNER_STEP_MAP
const steps = computed(() => {
  const step = currentStep.value
  const deadline = currentDeadline.value

  return Object.values(DINNER_STEP_MAP).map((config) => ({
    step: config.step,
    title: config.title,
    description: config.step === step && props.showDeadlines ? deadline.description : config.text,
    icon: config.icon,
    disabled: config.step > step,
    color: getBadgeForStep(config.step)?.color ?? COLOR.neutral
  }))
})
</script>

<template>
  <div>
    <!-- Data provider for deadline badges (hidden in stepper mode) -->
    <DinnerDeadlineBadges
      ref="deadlineBadgesRef"
      :dinner-event="dinnerEvent"
      :deadlines="deadlines"
      mode="stepper"
      class="hidden"
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
      :ui="{ description: TYPOGRAPHY.finePrint }"
    >
      <!-- Custom description: text + badge below (no badges for past events) -->
      <template #description="{ item }">
        <div>
          <span>{{ item.description }}</span>
          <div v-if="!isPastEvent && getBadgeForStep(item.step)" class="mt-1">
            <span>{{ getBadgeForStep(item.step)!.value }}</span>
          </div>
        </div>
      </template>
    </UStepper>
  </div>
</template>
