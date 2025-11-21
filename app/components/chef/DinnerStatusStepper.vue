<script setup lang="ts">
/**
 * DinnerStatusStepper - Visual progress indicator for dinner preparation
 *
 * Shows chef's progress through dinner lifecycle:
 * 1. Annoncer menu - Announce menu (SCHEDULED→ANNOUNCED)
 * 2. Book madvarer - Grocery shopping (chef action)
 * 3. Tilbered maden - Cook the food (day of dinner)
 * 4. Spis! - Eat! (CONSUMED) 🍽️
 *
 * Two display modes:
 * - compact: Just the steps bar for TeamRoleStatus overview
 * - full: Steps + deadline details for DinnerMenuHero detail
 *
 * Uses Nuxt UI USteps component for consistent design
 * Uses useSeason utilities for ALL deadline computations (ADR compliance)
 *
 * Used in:
 * - TeamRoleStatus (compact mode)
 * - DinnerMenuHero (full mode, chef only)
 *
 * ADR Compliance:
 * - ADR-001: Types from validation composables
 * - Mobile-first responsive design
 * - Uses NuxtUI components (USteps)
 * - Uses useSeason for time-related logic (no manual date calculations)
 */
import type { DinnerState } from '~/composables/useBookingValidation'
import { format } from 'date-fns'
import { da } from 'date-fns/locale'

interface Props {
  dinnerState: DinnerState
  menuTitle: string
  dinnerDate: Date
  mode?: 'compact' | 'full'
  showDeadlines?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'compact',
  showDeadlines: false
})

// Design system
const { COLOR } = useTheSlopeDesignSystem()

// Validation schemas
const { DinnerStateSchema } = useBookingValidation()
const DinnerState = DinnerStateSchema.enum

// Season utilities for ALL deadline calculations
const {
  isAnnounceMenuPastDeadline,
  canModifyOrders,
  getDefaultDinnerStartTime,
  getDinnerTimeRange
} = useSeason()

const dinnerStartHour = getDefaultDinnerStartTime()

// Check if it's dinner day (using getDinnerTimeRange)
const isDinnerDay = computed(() => {
  const dinnerTimeRange = getDinnerTimeRange(props.dinnerDate, dinnerStartHour, 0)
  return new Date() >= dinnerTimeRange.start
})

// Calculate current step based on dinner state and progress
const currentStep = computed(() => {
  const hasMenuTitle = props.menuTitle && props.menuTitle !== 'TBD' && props.menuTitle.length > 0
  const isAnnounced = props.dinnerState === DinnerState.ANNOUNCED
  const isConsumed = props.dinnerState === DinnerState.CONSUMED

  if (isConsumed) return 4 // Spis! (completed)
  if (isDinnerDay.value && isAnnounced) return 3 // Tilbered maden (cooking phase)
  if (isAnnounced) return 2 // Book madvarer (announced, grocery shopping phase)
  if (hasMenuTitle) return 1 // Annoncer menu (menu ready, needs announcement)
  return 0 // Menu creation phase (before step 1)
})

// Steps configuration for USteps
const steps = computed(() => {
  const hasMenuTitle = props.menuTitle && props.menuTitle !== 'TBD' && props.menuTitle.length > 0
  const isAnnounced = props.dinnerState === DinnerState.ANNOUNCED
  const isConsumed = props.dinnerState === DinnerState.CONSUMED
  const menuDeadlinePassed = isAnnounceMenuPastDeadline(props.dinnerDate)
  const bookingOpen = canModifyOrders(props.dinnerDate)

  return [
    {
      label: 'Annoncer menu',
      description: hasMenuTitle
        ? isAnnounced
          ? '✅ Annonceret'
          : menuDeadlinePassed
            ? '⚠️ Deadline overskredet'
            : 'Klar til annoncering'
        : 'Menu mangler',
      icon: 'i-heroicons-megaphone',
      disabled: false
    },
    {
      label: 'Book madvarer',
      description: isAnnounced
        ? isConsumed
          ? '✅ Indkøbt'
          : `Husk indkøb inden ${format(props.dinnerDate, 'd. MMM', { locale: da })}`
        : 'Afventer annoncering',
      icon: 'i-heroicons-shopping-cart',
      disabled: !isAnnounced && !isConsumed
    },
    {
      label: 'Tilbered maden',
      description: isConsumed
        ? '✅ Tilberedt og serveret'
        : isAnnounced
          ? `${format(props.dinnerDate, 'd. MMM kl. ${dinnerStartHour}:00', { locale: da })}`
          : 'Afventer annoncering',
      icon: 'i-heroicons-fire',
      disabled: !isAnnounced && !isConsumed
    },
    {
      label: 'Spis!',
      description: isConsumed
        ? `🎉 ${format(props.dinnerDate, 'd. MMM', { locale: da })}`
        : 'Afventer afvikling',
      icon: 'i-heroicons-face-smile',
      disabled: !isConsumed
    }
  ]
})

// Most urgent deadline warning (for full mode)
const urgentWarning = computed(() => {
  const hasMenuTitle = props.menuTitle && props.menuTitle !== 'TBD' && props.menuTitle.length > 0
  const isAnnounced = props.dinnerState === DinnerState.ANNOUNCED
  const menuDeadlinePassed = isAnnounceMenuPastDeadline(props.dinnerDate)
  const bookingOpen = canModifyOrders(props.dinnerDate)

  if (!hasMenuTitle) {
    return {
      show: true,
      message: '⚠️ Menu skal oprettes',
      color: COLOR.warning
    }
  }

  if (!isAnnounced && menuDeadlinePassed) {
    return {
      show: true,
      message: '🚨 HASTER! Annoncér menu nu - deadline overskredet',
      color: COLOR.error
    }
  }

  if (!isAnnounced && bookingOpen) {
    return {
      show: true,
      message: '⚠️ Annoncér menu snart - bestillinger åbner snart',
      color: COLOR.warning
    }
  }

  return { show: false, message: '', color: '' }
})

// Get announce deadline date (using season booking window logic)
const announceDeadline = computed(() => {
  // Booking closes 10 days before dinner (from season.ticketIsCancellableDaysBefore)
  // Chef should announce before booking opens
  const deadlineDate = new Date(props.dinnerDate)
  deadlineDate.setDate(deadlineDate.getDate() - 10)
  deadlineDate.setHours(12, 0, 0, 0)
  return deadlineDate
})
</script>

<template>
  <div class="space-y-3">
    <!-- Title (full mode only) -->
    <div v-if="mode === 'full'" class="text-xs font-semibold uppercase text-neutral-600 dark:text-neutral-400">
      Status
    </div>

    <!-- Urgent warning (full mode only) -->
    <UAlert
      v-if="mode === 'full' && urgentWarning.show"
      :color="urgentWarning.color"
      variant="soft"
      :icon="urgentWarning.color === COLOR.error ? 'i-heroicons-exclamation-circle' : 'i-heroicons-exclamation-triangle'"
    >
      <template #title>
        {{ urgentWarning.message }}
      </template>
    </UAlert>

    <!-- Nuxt UI Steps Component -->
    <USteps
      :model-value="currentStep"
      :items="steps"
      :size="mode === 'compact' ? 'sm' : 'md'"
      :orientation="mode === 'compact' ? 'horizontal' : 'vertical'"
      :ui="{
        line: mode === 'compact' ? 'w-8 md:w-12' : undefined
      }"
    />

    <!-- Additional deadline details (full mode only) -->
    <div v-if="mode === 'full' && showDeadlines" class="mt-4 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg space-y-2">
      <div class="text-xs font-semibold uppercase text-neutral-600 dark:text-neutral-400">
        📅 Vigtige datoer
      </div>
      <div class="text-sm space-y-1">
        <div class="flex justify-between">
          <span class="text-neutral-600 dark:text-neutral-400">Annoncer senest:</span>
          <span class="font-medium">
            {{ format(announceDeadline, 'd. MMM kl. 12:00', { locale: da }) }}
          </span>
        </div>
        <div class="flex justify-between">
          <span class="text-neutral-600 dark:text-neutral-400">Bestillinger lukker:</span>
          <span class="font-medium">
            {{ format(announceDeadline, 'd. MMM kl. 12:00', { locale: da }) }}
          </span>
        </div>
        <div class="flex justify-between">
          <span class="text-neutral-600 dark:text-neutral-400">Fællesspisning:</span>
          <span class="font-medium">
            {{ format(dinnerDate, `d. MMM kl. ${dinnerStartHour}:00`, { locale: da }) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
