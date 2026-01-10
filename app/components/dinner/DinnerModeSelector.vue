<script setup lang="ts">
/**
 * DinnerModeSelector - Reusable dinner mode selection element
 *
 * THE atomic component for dinner mode display - extracted from WeekDayMapDinnerModeDisplay
 * for DRY reuse across:
 * - Weekly preferences (WeekDayMapDinnerModeDisplay uses this 5 times)
 * - Single event booking (ChefMenuCard booking rows)
 * - Table headers (weekday title badges)
 * - Grid cells (BookingGridView uses toggle mode)
 *
 * TITLE MODE (modelValue is WeekDay):
 * ┌─────┐
 * │ Man │ - Weekday title badge (3 letters desktop, 1 letter mobile)
 * └─────┘
 *
 * SELECTOR VIEW MODE (modelValue is DinnerMode):
 * ┌────────────────┐
 * │ 🍽️ Fællesspisning │ - Badge showing current selection
 * └────────────────┘
 *
 * SELECTOR EDIT MODE - BUTTONS (interaction="buttons", default):
 * ┌──────────────────────────────────────────────────────┐
 * │ [🍽️ Spis][🕐 Sen][🛍️ Takeaway][❌ Ingen]          │
 * │  ^^^^^^^^^                                           │
 * │  active (solid, success)                             │
 * │           ^^^^^^^^ ^^^^^^^^^^^^ ^^^^^^^^^^^^         │
 * │           inactive (ghost, neutral)                  │
 * └──────────────────────────────────────────────────────┘
 *
 * SELECTOR EDIT MODE - TOGGLE (interaction="toggle"):
 * ┌─────┐
 * │ 🍽️  │ - Single button, click cycles: DINEIN→LATE→TAKE→NONE
 * └─────┘   Compact for grid cells
 */
import {DinnerMode} from '~/composables/useBookingValidation'
import {WEEKDAYS, type WeekDay} from '~/types/dateTypes'
import {FORM_MODES, type FormMode} from '~/types/form'
import type {BadgeProps, ButtonProps} from '@nuxt/ui'

type BadgeColor = NonNullable<BadgeProps['color']>
type BadgeVariant = NonNullable<BadgeProps['variant']>
type ButtonSize = NonNullable<ButtonProps['size']>
type ButtonVariant = NonNullable<ButtonProps['variant']>

// Local styling constant (field group only - badge size from design system)
const FIELD_GROUP_CLASSES = 'p-0 md:p-1.5 rounded-none md:rounded-lg border border-default bg-neutral gap-0 md:gap-1'

interface Props {
  modelValue?: WeekDay | DinnerMode // Optional - defaults to NONE when no order exists
  formMode?: FormMode
  disabled?: boolean
  disabledModes?: DinnerMode[] // Specific modes to disable (e.g., after deadline)
  name?: string
  showLabel?: boolean // Show mode label text in VIEW mode (when in selector mode)
  size?: ButtonSize
  consensus?: boolean // Power mode: true=all agree, false=mixed preferences, undefined=not power mode
  interaction?: 'buttons' | 'toggle' // buttons = show all options, toggle = click cycles through modes
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: DinnerMode.NONE, // Default when no order exists
  formMode: FORM_MODES.VIEW,
  disabled: false,
  disabledModes: () => [],
  name: 'dinner-mode-selector',
  showLabel: false,
  size: 'sm',
  consensus: undefined,
  interaction: 'buttons'
})

const emit = defineEmits<{
  'update:modelValue': [value: DinnerMode]
}>()

// Track if user has made a selection (consensus decided)
const hasUserSelected = ref(false)

// Reset when consensus changes (new edit session)
watch(() => props.consensus, () => {
  hasUserSelected.value = false
})

// Design system
const { WEEKDAY, ORIENTATIONS, ICONS } = useTheSlopeDesignSystem()

// Determine if we're in title mode (showing weekday) or selector mode (showing dinner mode)
const isTitle = computed(() => WEEKDAYS.includes(props.modelValue as WeekDay))

// Unwrap responsive orientation (vertical on mobile, horizontal on desktop)
const buttonOrientation = computed(() => ORIENTATIONS.responsive.value)

// Dinner mode display config (shared with WeekDayMapDinnerModeDisplay)
const dinnerModeOrder: DinnerMode[] = [
  DinnerMode.DINEIN,
  DinnerMode.DINEINLATE,
  DinnerMode.TAKEAWAY,
  DinnerMode.NONE
]

const dinnerModeConfig: Record<DinnerMode, {
  label: string
  icon: string
  activeColor: BadgeColor
  viewVariant: BadgeVariant
  editActiveVariant: ButtonVariant
  editInactiveVariant: ButtonVariant
}> = {
  [DinnerMode.DINEIN]: {
    label: 'Fællesspisning',
    icon: 'i-streamline-food-kitchenware-spoon-plate-fork-plate-food-dine-cook-utensils-eat-restaurant-dining',
    activeColor: 'success',
    viewVariant: 'solid',
    editActiveVariant: 'solid',
    editInactiveVariant: 'soft'
  },
  [DinnerMode.DINEINLATE]: {
    label: 'Fællesspisning (sen)',
    icon: 'i-heroicons-clock',
    activeColor: 'success',
    viewVariant: 'solid',
    editActiveVariant: 'solid',
    editInactiveVariant: 'soft'
  },
  [DinnerMode.TAKEAWAY]: {
    label: 'Takeaway',
    icon: 'i-heroicons-shopping-bag',
    activeColor: 'success',
    viewVariant: 'solid',
    editActiveVariant: 'solid',
    editInactiveVariant: 'soft'
  },
  [DinnerMode.NONE]: {
    label: 'Ingen spisning',
    icon: 'i-heroicons-x-circle',
    activeColor: 'error',
    viewVariant: 'soft',
    editActiveVariant: 'solid',
    editInactiveVariant: 'soft'
  }
}

// Check if a specific mode is disabled
const isModeDisabled = (mode: DinnerMode): boolean => {
  return props.disabled || props.disabledModes.includes(mode)
}

// Update value (selector mode only)
const updateMode = (value: DinnerMode) => {
  if (props.disabled || isModeDisabled(value) || props.formMode === FORM_MODES.VIEW || isTitle.value) return
  hasUserSelected.value = true
  emit('update:modelValue', value)
}

// Toggle to next mode (for toggle interaction)
const toggleMode = () => {
  if (props.disabled || props.formMode === FORM_MODES.VIEW || isTitle.value) return
  const currentIndex = dinnerModeOrder.indexOf(dinnerMode.value)
  // Find next enabled mode (skip disabled ones)
  for (let i = 1; i <= dinnerModeOrder.length; i++) {
    const nextIndex = (currentIndex + i) % dinnerModeOrder.length
    const nextMode = dinnerModeOrder[nextIndex]!
    if (!isModeDisabled(nextMode)) {
      hasUserSelected.value = true
      emit('update:modelValue', nextMode)
      return
    }
  }
}

// Get dinner mode value (when in selector mode)
const dinnerMode = computed(() => props.modelValue as DinnerMode)

// Get icon for current mode
const getModeIcon = (): string => {
  return dinnerModeConfig[dinnerMode.value]!.icon
}

// Get badge color for VIEW mode (neutral when no consensus in power mode)
const getBadgeColor = (): BadgeColor => {
  if (props.consensus === false) return 'neutral'
  return dinnerModeConfig[dinnerMode.value]!.activeColor
}

// Get badge variant for VIEW mode (outline when no consensus in power mode)
const getBadgeVariant = (): BadgeVariant => {
  if (props.consensus === false) return 'outline'
  return dinnerModeConfig[dinnerMode.value]!.viewVariant
}

// Get button color for EDIT mode (active vs inactive)
const getButtonColor = (mode: DinnerMode): BadgeColor => {
  const isActive = dinnerMode.value === mode
  return isActive ? dinnerModeConfig[mode]!.activeColor : 'neutral'
}

// Get button variant for EDIT mode (active vs inactive)
const getButtonVariant = (mode: DinnerMode): ButtonVariant => {
  const isActive = dinnerMode.value === mode
  return isActive ? dinnerModeConfig[mode]!.editActiveVariant : dinnerModeConfig[mode]!.editInactiveVariant
}

// Check if button should pulse (DINEIN is fallback default without consensus)
// Stop pulsing once user makes any selection (consensus decided)
const shouldPulse = (mode: DinnerMode): boolean => {
  if (hasUserSelected.value) return false
  return mode === DinnerMode.DINEIN && dinnerMode.value === DinnerMode.DINEIN && props.consensus === false
}

// Get mode label
const getModeLabel = (): string => {
  return dinnerModeConfig[dinnerMode.value]!.label
}
</script>

<template>
  <!-- TITLE MODE: Weekday header badge -->
  <template v-if="isTitle">
    <UBadge
      v-bind="WEEKDAY.titleBadgeProps"
      :size="size"
      :name="name"
      :data-testid="name"
    >
      <div :class="`${WEEKDAY.badgeContentSize} flex items-center justify-center text-xs font-medium text-gray-900 dark:text-white`">
        {{ WEEKDAY.getLabel(modelValue as WeekDay) }}
      </div>
    </UBadge>
  </template>

  <!-- SELECTOR MODE: Dinner mode selection -->
  <template v-else>
    <!-- VIEW MODE: Badge showing current selection -->
    <UBadge
      v-if="formMode === FORM_MODES.VIEW"
      :color="getBadgeColor()"
      :variant="getBadgeVariant()"
      :size="size"
      :name="name"
      :data-testid="name"
    >
      <UIcon v-if="consensus === false" :name="ICONS.help" :class="WEEKDAY.badgeContentSize" />
      <UIcon v-else :name="getModeIcon()" :class="WEEKDAY.badgeContentSize" />
      <span v-if="showLabel" class="ml-1">{{ getModeLabel() }}</span>
    </UBadge>

    <!-- EDIT MODE: Toggle (single button, click cycles) -->
    <UButton
      v-else-if="formMode === FORM_MODES.EDIT && interaction === 'toggle'"
      :icon="getModeIcon()"
      :color="dinnerModeConfig[dinnerMode]!.activeColor"
      :variant="dinnerModeConfig[dinnerMode]!.editActiveVariant"
      :disabled="disabled"
      :size="size"
      :name="name"
      :data-testid="name"
      :ui="{ leadingIcon: WEEKDAY.badgeContentSize }"
      @click="toggleMode"
    />

    <!-- EDIT MODE: Button group for selection -->
    <UFieldGroup
      v-else-if="formMode === FORM_MODES.EDIT"
      :size="size"
      :orientation="buttonOrientation"
      :class="FIELD_GROUP_CLASSES"
      :name="name"
      :data-testid="name"
    >
      <UButton
        v-for="mode in dinnerModeOrder"
        :key="mode"
        :icon="dinnerModeConfig[mode]!.icon"
        :color="getButtonColor(mode)"
        :variant="getButtonVariant(mode)"
        :disabled="isModeDisabled(mode)"
        :size="size"
        :data-testid="`${name}-${mode}`"
        :class="['rounded-none md:rounded-md', { 'animate-pulse': shouldPulse(mode) }]"
        :ui="{ leadingIcon: WEEKDAY.badgeContentSize }"
        @click="updateMode(mode)"
      />
    </UFieldGroup>
  </template>
</template>
