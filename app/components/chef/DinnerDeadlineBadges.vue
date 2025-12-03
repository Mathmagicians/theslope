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
 * STEP → BADGE MAPPING
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 *  ●━━━━━━━━━━━━○━━━━━━━━━━━━○━━━━━━━━━━━━○━━━━━━━━━━━━○
 *  │            │            │            │            │
 *  Planlagt     Annonceret   Tilmelding   Indkøb       Afholdt
 *  │            │            lukket       klar         │
 *  │            │            │            │            │
 *  (no badge)   [⚠️ om 2d]   [✅ Åben]    [💰 1.500kr] │
 *               Menu         Tilmelding   Budget       │
 *               deadline     status                    │
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * STANDALONE MODE (mode='standalone') - Vertical list for agenda card
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ Menu: [⚠️ om 2d 4t]              ← Color on VALUE                       │
 * │ Tilmelding: [Åben]                                                      │
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

export interface DeadlineBadge {
  step: number           // Which stepper step this badge belongs to
  label: string          // Label for standalone mode
  value: string          // Badge text
  color: NuxtUIColor     // Badge color
  helpText: string       // Help text for standalone mode
}

interface Props {
  dinnerEvent: DinnerEventDisplay
  mode?: 'standalone' | 'stepper'
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'standalone'
})

// Design system
const { SIZES, COLOR, URGENCY_TO_BADGE } = useTheSlopeDesignSystem()

// Business logic from useSeason (ADR-001)
const { canModifyOrders, getDefaultDinnerStartTime, getDinnerTimeRange, getDeadlineUrgency } = useSeason()
const dinnerStartHour = getDefaultDinnerStartTime()

// ========== MENU DEADLINE BADGE (Step 1: Annonceret) ==========

const menuBadge = computed((): DeadlineBadge => {
  const dinnerTimeRange = getDinnerTimeRange(props.dinnerEvent.date, dinnerStartHour, 0)
  const countdown = calculateCountdown(dinnerTimeRange.start)
  const urgency = getDeadlineUrgency(dinnerTimeRange.start)
  const badge = URGENCY_TO_BADGE[urgency]

  return {
    step: 1, // Belongs to "Annonceret" step
    label: 'Menu',
    value: urgency === 0 ? badge.label : `om ${countdown.formatted}`,
    color: badge.color as NuxtUIColor,
    helpText: 'Tid til at annoncere menuen'
  }
})

// ========== TILMELDING STATUS BADGE (Step 2: Tilmelding lukket) ==========

const tilmeldingBadge = computed((): DeadlineBadge => {
  const isOpen = canModifyOrders(props.dinnerEvent.date)
  return {
    step: 2, // Belongs to "Tilmelding lukket" step
    label: 'Tilmelding',
    value: isOpen ? 'Åben' : 'Lukket',
    color: (isOpen ? COLOR.success : COLOR.neutral) as NuxtUIColor,
    helpText: isOpen
      ? 'Beboerne kan købe billetter'
      : 'Billetsalget er lukket'
  }
})

// All badges in step order (for standalone mode)
const badges = computed(() => [menuBadge.value, tilmeldingBadge.value])

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
