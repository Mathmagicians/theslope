<script setup lang="ts">
/**
 * DinnerDeadlineBadges - Deadline/status badges for dinner workflow steps
 *
 * Shows deadline information mapped to the correct workflow steps.
 * Each badge belongs to the step it leads TO (the goal), not the current step.
 *
 * Used by:
 * - DinnerStatusStepper (mode='stepper') - badges under each step
 * - ChefDinnerCard (mode='standalone') - vertical list for agenda
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * STEP → BADGE MAPPING (with urgency emojis)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * Urgency emojis: 🟢 done, ⚪ neutral, 🟡 warning, 🔴 critical
 *
 *  ●━━━━━━━━━━━━○━━━━━━━━━━━━○━━━━━━━━━━━━○━━━━━━━━━━━━○
 *  │            │            │            │            │
 *  Planlagt     Annonceret   Tilmelding   Indkøb       Afholdt
 *  │            │            lukket       klar         │
 *  │            │            │            │            │
 *  (no badge)   [🟡 om 2d]   [🟢 Åben]    [🔴 om 1d]   │
 *               Menu         Tilmelding   Indkøb       │
 *               deadline     status       deadline     │
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * STANDALONE MODE (mode='standalone') - Vertical list for agenda card
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ Menu: [🟡 om 2d 4t]              ← Urgency emoji + countdown            │
 * │ Tilmelding: [🟢 Åben]            ← Status with emoji                    │
 * │ Indkøb: [🔴 om 1d]               ← Urgency emoji + countdown            │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * STEPPER MODE (mode='stepper') - Integrated into DinnerStatusStepper
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Returns badge data for each step, rendered by stepper component
 *
 * ADR Compliance:
 * - ADR-001: Types from validation composables, business logic in useSeason
 * - Uses design system (URGENCY_TO_BADGE, COLOR)
 * - Mobile-first responsive design
 */
import type { DinnerEventDisplay } from '~/composables/useBookingValidation'
import type { NuxtUIColor } from '~/composables/useTheSlopeDesignSystem'
import type { SeasonDeadlines } from '~/composables/useSeason'

export interface DeadlineBadge {
  step: number           // Which stepper step this badge belongs to
  label: string          // Label for standalone mode
  value: string          // Badge text
  color: NuxtUIColor     // Badge color
  helpText: string       // Help text for standalone mode
}

interface Props {
  dinnerEvent: DinnerEventDisplay
  deadlines: SeasonDeadlines
  mode?: 'standalone' | 'stepper'
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'standalone'
})

// Design system
const { SIZES, URGENCY_TO_BADGE, DEADLINE_BADGES } = useTheSlopeDesignSystem()

// Business logic from composables (ADR-001)
const { getDefaultDinnerStartTime, getDinnerTimeRange, getDeadlineUrgency } = useSeason()
const { getDinnerStepState, DEADLINE_LABELS } = useBooking()
const dinnerStartHour = getDefaultDinnerStartTime()

// Current step state for this dinner (uses season-specific deadline from props)
const stepState = computed(() => getDinnerStepState(props.dinnerEvent, props.deadlines))

// ========== MENU DEADLINE BADGE (Step 1: Annonceret) ==========
// Green dot if announced (step >= 1), otherwise countdown with urgency color

const menuBadge = computed((): DeadlineBadge => {
  // Menu is done when we've reached at least ANNOUNCED step
  if (stepState.value >= DinnerStepState.ANNOUNCED) {
    return {
      step: 1,
      label: DEADLINE_LABELS.ANNOUNCED.label,
      value: `${DEADLINE_BADGES.DONE.emoji} ${DEADLINE_LABELS.ANNOUNCED.closedText}`,
      color: DEADLINE_BADGES.DONE.color as NuxtUIColor,
      helpText: 'Menuen er annonceret'
    }
  }

  const dinnerTimeRange = getDinnerTimeRange(props.dinnerEvent.date, dinnerStartHour, 0)
  const countdown = calculateCountdown(dinnerTimeRange.start)
  const urgency = getDeadlineUrgency(dinnerTimeRange.start)
  const badge = URGENCY_TO_BADGE[urgency]

  return {
    step: 1,
    label: DEADLINE_LABELS.ANNOUNCED.label,
    value: `${badge.emoji} om ${countdown.formatted}`,
    color: badge.color as NuxtUIColor,
    helpText: DEADLINE_LABELS.ANNOUNCED.openText
  }
})

// ========== BOOKING CLOSED STATUS BADGE (Step 2) ==========
// "Framelding" (not "Tilmelding") - system auto-signs up via preferences (ADR-015)

const bookingClosedBadge = computed((): DeadlineBadge => {
  const isOpen = props.deadlines.canModifyOrders(props.dinnerEvent.date)
  return {
    step: 2,
    label: DEADLINE_LABELS.BOOKING_CLOSED.label,
    value: isOpen
      ? `${DEADLINE_BADGES.DONE.emoji} ${DEADLINE_LABELS.BOOKING_CLOSED.openText}`
      : `${DEADLINE_BADGES.ON_TRACK.emoji} ${DEADLINE_LABELS.BOOKING_CLOSED.closedText}`,
    color: (isOpen ? DEADLINE_BADGES.DONE.color : DEADLINE_BADGES.ON_TRACK.color) as NuxtUIColor,
    helpText: isOpen
      ? 'Framelding mulig'
      : 'Man kan kun frigive billetter'
  }
})

// ========== GROCERIES DONE BADGE (Step 3) ==========
// Green dot if groceries done (totalCost > 0), otherwise countdown with urgency color

const groceriesDoneBadge = computed((): DeadlineBadge => {
  // Groceries done when we've reached at least GROCERIES_DONE step
  if (stepState.value >= DinnerStepState.GROCERIES_DONE) {
    return {
      step: 3,
      label: DEADLINE_LABELS.GROCERIES_DONE.label,
      value: `${DEADLINE_BADGES.DONE.emoji} ${DEADLINE_LABELS.GROCERIES_DONE.closedText}`,
      color: DEADLINE_BADGES.DONE.color as NuxtUIColor,
      helpText: 'Indkøb er registreret'
    }
  }

  const dinnerTimeRange = getDinnerTimeRange(props.dinnerEvent.date, dinnerStartHour, 0)
  const countdown = calculateCountdown(dinnerTimeRange.start)
  const urgency = getDeadlineUrgency(dinnerTimeRange.start)
  const badge = URGENCY_TO_BADGE[urgency]

  return {
    step: 3,
    label: DEADLINE_LABELS.GROCERIES_DONE.label,
    value: `${badge.emoji} om ${countdown.formatted}`,
    color: badge.color as NuxtUIColor,
    helpText: DEADLINE_LABELS.GROCERIES_DONE.openText
  }
})

// All badges in step order (for standalone mode)
const badges = computed(() => [menuBadge.value, bookingClosedBadge.value, groceriesDoneBadge.value])

// Export badges by step (for stepper mode)
const getBadgeForStep = (step: number): DeadlineBadge | null => {
  return badges.value.find(b => b.step === step) ?? null
}

// Expose for stepper integration
defineExpose({ badges, getBadgeForStep })
</script>

<template>
  <!-- STANDALONE MODE - Vertical list for agenda card -->
  <div v-if="mode === 'standalone'" class="text-xs space-y-0.5">
    <div v-for="badge in badges" :key="badge.label" class="flex justify-center items-center gap-2">
      <span class="text-neutral-500">{{ badge.label }}:</span>
      <UBadge :color="badge.color" variant="soft" :size="SIZES.small">
        {{ badge.value }}
      </UBadge>
    </div>
  </div>

  <!-- STEPPER MODE - Rendered by parent stepper, this is just a data provider -->
  <!-- In stepper mode, badges are exposed via defineExpose and rendered by DinnerStatusStepper -->
</template>
