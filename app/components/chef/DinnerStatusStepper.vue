<script setup lang="ts">
/**
 * DinnerStatusStepper - Dinner preparation progress stepper
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * STEP → BADGE INTEGRATION
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * Alarm levels: -1=neutral(⚪), 0=green(🟢), 1=yellow(🟡), 2=red(🔴), 3=overdue(⚫💀)
 *
 *  ●━━━━━━━━━━━━○━━━━━━━━━━━━○━━━━━━━━━━━━○━━━━━━━━━━━━○
 *  │            │            │            │            │
 *  Planlagt     Publiceret   Lukket for   Madbestilling Afholdt
 *  │            │            ændringer    klar         │
 *  │            │            │            │            │
 *  (no badge)   [🟢 om 2d]   [🟢 åben..]  [🟢 om 1d]   [🟢 om..]
 *               g/y/r/💀     g/y/r/⚪     g/y/r/💀     g/⚪
 *
 * Badges are rendered UNDER each step using createChefBadges factory.
 *
 * ADR Compliance:
 * - ADR-001/017: Step logic in useBooking (DINNER_STEP_MAP, getStepConfig); badges + icons in useBookingUi (createChefBadges, STEP_ICONS)
 * - Mobile-first responsive design
 * - Uses NuxtUI UStepper component
 */
import type { DinnerEventDisplay } from '~/composables/useBookingValidation'
import type { SeasonDeadlines } from '~/composables/useSeason'
import type { DeadlineBadgeData } from '~/composables/useBookingUi'
import { DINNER_STEP_MAP, type DinnerStepState } from '~/composables/useBooking'

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
const { getStepConfig } = useBooking()
const { createChefBadges, STEP_ICONS } = useBookingUi()
const { DinnerStateSchema } = useBookingValidation()
const DinnerState = DinnerStateSchema.enum

// Get released ticket count from store (for booking badge)
const bookingsStore = useBookingsStore()
const releasedTicketCount = computed(() => bookingsStore.lockStatus.get(props.dinnerEvent.id) ?? undefined)

// Badges from factory (pass released count for booking badge)
const badges = computed(() => createChefBadges(props.dinnerEvent, props.deadlines, releasedTicketCount.value))

// Current step (using season-specific deadlines from props)
const currentStepConfig = computed(() => getStepConfig(props.dinnerEvent, props.deadlines))
const currentStep = computed(() => currentStepConfig.value.step)

// Is cancelled?
const isCancelled = computed(() => props.dinnerEvent.state === DinnerState.CANCELLED)

// Is past/consumed event? (only show overdue badges for past events - user actions that were never completed)
const isPastEvent = computed(() => props.dinnerEvent.state === DinnerState.CONSUMED)

// Get badge for a specific step
const getBadgeForStep = (step: number): DeadlineBadgeData | null => badges.value.get(step) ?? null

// Build stepper items from DINNER_STEP_MAP
const steps = computed(() => {
  const step = currentStep.value

  return Object.values(DINNER_STEP_MAP).map((config) => {
    const badge = getBadgeForStep(config.step)
    // Use badge helpText (open/closed text based on completion)
    // For step 0 (Planlagt), use config.text since there's no badge
    const description = badge?.helpText ?? config.text

    return {
      step: config.step,
      title: config.title,
      description,
      icon: STEP_ICONS[config.step as DinnerStepState],
      disabled: config.step > step,
      color: badge?.color ?? COLOR.neutral
    }
  })
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
      <!-- Custom description: text + badge below (show overdue badges even for past events) -->
      <template #description="{ item }">
        <div class="flex flex-col items-center">
          <span>{{ item.description }}</span>
          <div v-if="getBadgeForStep(item.step) && (!isPastEvent || getBadgeForStep(item.step)!.alarm === 3)" class="mt-1">
            <DeadlineBadge :badge="getBadgeForStep(item.step)!" compact />
          </div>
        </div>
      </template>
    </UStepper>
  </div>
</template>
