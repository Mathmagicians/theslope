<script setup lang="ts">
/**
 * DinnerModeSelector - Reusable dinner mode selection element
 *
 * THE atomic component for dinner mode display - extracted from WeekDayMapDinnerModeDisplay
 * for DRY reuse across:
 * - Weekly preferences (WeekDayMapDinnerModeDisplay uses this 5 times)
 * - Single event booking (ChefMenuCard booking rows)
 * - Table headers (weekday title badges)
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
 * SELECTOR EDIT MODE (modelValue is DinnerMode):
 * ┌──────────────────────────────────────────────────────┐
 * │ [🍽️ Spis][🕐 Sen][🛍️ Takeaway][❌ Ingen]          │
 * │  ^^^^^^^^^                                           │
 * │  active (solid, success)                             │
 * │           ^^^^^^^^ ^^^^^^^^^^^^ ^^^^^^^^^^^^         │
 * │           inactive (ghost, neutral)                  │
 * └──────────────────────────────────────────────────────┘
 */
import {DinnerMode} from '~/composables/useBookingValidation'
import {WEEKDAYS, type WeekDay} from '~/types/dateTypes'
import {FORM_MODES, type FormMode} from '~/types/form'
import type {BadgeProps, ButtonProps} from '@nuxt/ui'

type BadgeColor = NonNullable<BadgeProps['color']>
type BadgeVariant = NonNullable<BadgeProps['variant']>
type ButtonSize = NonNullable<ButtonProps['size']>
type ButtonVariant = NonNullable<ButtonProps['variant']>

// Local styling constants (used only in this component)
const FIELD_GROUP_CLASSES = 'p-0 md:p-1.5 rounded-none md:rounded-lg border border-default bg-neutral gap-0 md:gap-1'
const WEEKDAY_BADGE_CONTENT_SIZE = 'size-4 md:size-8'

interface Props {
  modelValue?: WeekDay | DinnerMode // Optional - defaults to NONE when no order exists
  formMode?: FormMode
  disabled?: boolean
  disabledModes?: DinnerMode[] // Specific modes to disable (e.g., after deadline)
  name?: string
  showLabel?: boolean // Show mode label text in VIEW mode (when in selector mode)
  size?: ButtonSize
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: DinnerMode.NONE, // Default when no order exists
  formMode: FORM_MODES.VIEW,
  disabled: false,
  disabledModes: () => [],
  name: 'dinner-mode-selector',
  showLabel: false,
  size: 'md'
})

const emit = defineEmits<{
  'update:modelValue': [value: DinnerMode]
}>()

// Design system
const { WEEKDAY, ORIENTATIONS } = useTheSlopeDesignSystem()

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
  emit('update:modelValue', value)
}

// Get dinner mode value (when in selector mode)
const dinnerMode = computed(() => props.modelValue as DinnerMode)

// Get icon for current mode
const getModeIcon = (): string => {
  return dinnerModeConfig[dinnerMode.value]!.icon
}

// Get badge color for VIEW mode
const getBadgeColor = (): BadgeColor => {
  return dinnerModeConfig[dinnerMode.value]!.activeColor
}

// Get badge variant for VIEW mode
const getBadgeVariant = (): BadgeVariant => {
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
      <div :class="`${WEEKDAY_BADGE_CONTENT_SIZE} flex items-center justify-center text-xs font-medium text-gray-900 dark:text-white`">
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
      <UIcon :name="getModeIcon()" :class="WEEKDAY_BADGE_CONTENT_SIZE" />
      <span v-if="showLabel" class="ml-1">{{ getModeLabel() }}</span>
    </UBadge>

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
        :name="`${name}-${mode}`"
        class="rounded-none md:rounded-md"
        @click="updateMode(mode)"
      />
    </UFieldGroup>
  </template>
</template>
