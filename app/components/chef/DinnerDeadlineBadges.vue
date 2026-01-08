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
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * STANDALONE MODE (mode='standalone') - Vertical list for agenda card
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ Menu: [🟢 om 2d 4t]              ← Urgency emoji + countdown            │
 * │ Framelding: [🟢 åben de næste..] ← Status with countdown                │
 * │ Indkøb: [🔴 om 1d]               ← Urgency emoji + countdown            │
 * │ Spisning: [🟢 om 18d]            ← Countdown to dinner                  │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * STEPPER MODE (mode='stepper') - Integrated into DinnerStatusStepper
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Returns badge data for each step, rendered by stepper component
 *
 * ADR Compliance:
 * - ADR-001: Types from validation composables, business logic in useBooking
 * - Uses design system (ALARM_TO_BADGE)
 * - Mobile-first responsive design
 */
import type { DinnerEventDisplay } from '~/composables/useBookingValidation'
import type { NuxtUIColor } from '~/composables/useTheSlopeDesignSystem'
import type { SeasonDeadlines } from '~/composables/useSeason'
import type { AlarmLevel } from '~/composables/useBooking'
import { DinnerStepState, DEADLINE_LABELS, DINNER_STEP_MAP } from '~/composables/useBooking'

export interface DeadlineBadge {
  step: number           // Which stepper step this badge belongs to
  label: string          // Label for standalone mode
  value: string          // Badge text (emoji + text)
  color: NuxtUIColor     // Badge color
  helpText: string       // Help text for standalone mode
  alarm: AlarmLevel      // Alarm level for conditional display (3 = overdue)
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
const { SIZES, ALARM_TO_BADGE } = useTheSlopeDesignSystem()

// Business logic from composables (ADR-001)
const { getDefaultDinnerStartTime, getDinnerTimeRange } = useSeason()
const dinnerStartHour = getDefaultDinnerStartTime()


// App config thresholds
const appConfig = useAppConfig()
const thresholds = {
  warning: appConfig.theslope?.cookingDeadlines?.warningHours ?? 72,
  critical: appConfig.theslope?.cookingDeadlines?.criticalHours ?? 24
}

// Helper to get badge from alarm level
const getBadgeFromAlarm = (alarm: AlarmLevel) => ALARM_TO_BADGE[alarm]

// Helper to create badge for a step using DINNER_STEP_MAP getDeadline
const createBadge = (
  step: number,
  stepKey: keyof typeof DEADLINE_LABELS,
  stepState: DinnerStepState,
  isCompleted: boolean
): DeadlineBadge => {
  const labels = DEADLINE_LABELS[stepKey]
  const stepConfig = DINNER_STEP_MAP[stepState]

  // Calculate deadline using step's getDeadline function
  const dinnerTimeRange = getDinnerTimeRange(props.dinnerEvent.date, dinnerStartHour, 0)
  const countdown = calculateCountdown(dinnerTimeRange.start)
  const isPastDeadline = props.deadlines.isAnnounceMenuPastDeadline(props.dinnerEvent.date)
  const result = stepConfig.getDeadline(countdown, isPastDeadline, thresholds)

  // Use neutral (-1) for completed steps, otherwise use calculated alarm
  const alarm = isCompleted ? -1 : result.alarm
  const badge = getBadgeFromAlarm(alarm)
  const text = isCompleted ? labels.closedText : labels.openText

  return {
    step,
    label: 'label' in labels ? labels.label : '',
    value: result.description ? `${badge.emoji} ${result.description}` : `${badge.emoji} ${text}`,
    color: badge.color as NuxtUIColor,
    helpText: text,
    alarm
  }
}

// Get dinner state enum
const { DinnerStateSchema } = useBookingValidation()
const DinnerState = DinnerStateSchema.enum

// ========== MENU BADGE (Step 1: Publiceret) ==========
// Completed when dinner was actually ANNOUNCED (not just past)
const menuBadge = computed((): DeadlineBadge => {
  const wasAnnounced = props.dinnerEvent.state === DinnerState.ANNOUNCED ||
                       (props.dinnerEvent.state === DinnerState.CONSUMED && props.dinnerEvent.heynaboEventId !== null)
  return createBadge(1, 'ANNOUNCED', DinnerStepState.ANNOUNCED, wasAnnounced)
})

// ========== BOOKING CLOSED BADGE (Step 2: Lukket for ændringer) ==========
// Completed when deadline has passed (booking closed)
const bookingClosedBadge = computed((): DeadlineBadge => {
  const isOpen = props.deadlines.canModifyOrders(props.dinnerEvent.date)
  return createBadge(2, 'BOOKING_CLOSED', DinnerStepState.BOOKING_CLOSED, !isOpen)
})

// ========== GROCERIES BADGE (Step 3: Madbestilling klar) ==========
// Completed when totalCost > 0 (chef entered grocery cost)
const groceriesDoneBadge = computed((): DeadlineBadge => {
  const hasGroceries = props.dinnerEvent.totalCost > 0
  return createBadge(3, 'GROCERIES_DONE', DinnerStepState.GROCERIES_DONE, hasGroceries)
})

// ========== CONSUMED BADGE (Step 4: Afholdt) ==========
// Completed when dinner state is CONSUMED
const consumedBadge = computed((): DeadlineBadge => {
  const isConsumed = props.dinnerEvent.state === DinnerState.CONSUMED
  return createBadge(4, 'CONSUMED', DinnerStepState.CONSUMED, isConsumed)
})

// All badges in step order (for standalone mode) - step 0 (Planlagt) has no badge
const badges = computed(() => [menuBadge.value, bookingClosedBadge.value, groceriesDoneBadge.value, consumedBadge.value])

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
