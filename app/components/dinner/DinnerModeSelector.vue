<script setup lang="ts">
/**
 * DinnerModeSelector - Reusable dinner mode selection element
 *
 * THE atomic component for dinner mode display - extracted from WeekDayMapDinnerModeDisplay
 * for DRY reuse across:
 * - Weekly preferences (WeekDayMapDinnerModeDisplay uses this 5 times)
 * - Single event booking (DinnerMenuHero booking rows)
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
import type {DinnerMode} from '~/composables/useDinnerEventValidation'
import {WEEKDAYS, type WeekDay} from '~/types/dateTypes'
import {FORM_MODES, type FormMode} from '~/types/form'
import {FIELD_GROUP_CLASSES, WEEKDAY_BADGE_CONTENT_SIZE} from '~/utils/form'
import type Badge from '#ui/components/Badge.vue'

type BadgeColor = Badge['variants']['color']

interface Props {
  modelValue: WeekDay | DinnerMode
  formMode?: FormMode
  disabled?: boolean
  name?: string
  showLabel?: boolean // Show mode label text in VIEW mode (when in selector mode)
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

const props = withDefaults(defineProps<Props>(), {
  formMode: FORM_MODES.VIEW,
  disabled: false,
  showLabel: false,
  size: 'md'
})

const emit = defineEmits<{
  'update:modelValue': [value: WeekDay | DinnerMode]
}>()

// Design system
const { WEEKDAY } = useTheSlopeDesignSystem()

// Dinner mode validation
const {DinnerModeSchema} = useDinnerEventValidation()
const DinnerMode = DinnerModeSchema.enum

// Determine if we're in title mode (showing weekday) or selector mode (showing dinner mode)
const isTitle = computed(() => WEEKDAYS.includes(props.modelValue as WeekDay))

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
  viewVariant: 'solid' | 'ghost' | 'outline'
  editActiveVariant: 'solid' | 'ghost'
  editInactiveVariant: 'solid' | 'ghost'
}> = {
  [DinnerMode.DINEIN]: {
    label: 'Fællesspisning',
    icon: 'i-streamline-food-kitchenware-spoon-plate-fork-plate-food-dine-cook-utensils-eat-restaurant-dining',
    activeColor: 'success',
    viewVariant: 'solid',
    editActiveVariant: 'solid',
    editInactiveVariant: 'ghost'
  },
  [DinnerMode.DINEINLATE]: {
    label: 'Fællesspisning (sen)',
    icon: 'i-heroicons-clock',
    activeColor: 'success',
    viewVariant: 'solid',
    editActiveVariant: 'solid',
    editInactiveVariant: 'ghost'
  },
  [DinnerMode.TAKEAWAY]: {
    label: 'Takeaway',
    icon: 'i-heroicons-shopping-bag',
    activeColor: 'success',
    viewVariant: 'solid',
    editActiveVariant: 'solid',
    editInactiveVariant: 'ghost'
  },
  [DinnerMode.NONE]: {
    label: 'Ingen spisning',
    icon: 'i-heroicons-x-circle',
    activeColor: 'error',
    viewVariant: 'ghost',
    editActiveVariant: 'solid',
    editInactiveVariant: 'ghost'
  }
}

// Update value (selector mode only)
const updateMode = (value: DinnerMode) => {
  if (props.disabled || props.formMode === FORM_MODES.VIEW || isTitle.value) return
  emit('update:modelValue', value)
}

// Get dinner mode value (when in selector mode)
const dinnerMode = computed(() => props.modelValue as DinnerMode)

// Get icon for current mode
const getModeIcon = (): string => {
  return dinnerModeConfig[dinnerMode.value].icon
}

// Get badge color for VIEW mode
const getBadgeColor = (): BadgeColor => {
  return dinnerModeConfig[dinnerMode.value].activeColor
}

// Get badge variant for VIEW mode
const getBadgeVariant = (): 'solid' | 'ghost' | 'outline' => {
  return dinnerModeConfig[dinnerMode.value].viewVariant
}

// Get button color for EDIT mode (active vs inactive)
const getButtonColor = (mode: DinnerMode): BadgeColor => {
  const isActive = dinnerMode.value === mode
  return isActive ? dinnerModeConfig[mode].activeColor : 'neutral'
}

// Get button variant for EDIT mode (active vs inactive)
const getButtonVariant = (mode: DinnerMode): 'solid' | 'ghost' => {
  const isActive = dinnerMode.value === mode
  return isActive ? dinnerModeConfig[mode].editActiveVariant : dinnerModeConfig[mode].editInactiveVariant
}

// Get mode label
const getModeLabel = (): string => {
  return dinnerModeConfig[dinnerMode.value].label
}
</script>

<template>
  <!-- TITLE MODE: Weekday header badge -->
  <UBadge
    v-if="isTitle"
    v-bind="WEEKDAY.titleBadgeProps"
    :size="size"
    :name="name"
    :data-testid="name"
  >
    <div :class="`${WEEKDAY_BADGE_CONTENT_SIZE} flex items-center justify-center text-xs font-medium text-gray-900 dark:text-white`">
      {{ WEEKDAY.getLabel(modelValue as WeekDay) }}
    </div>
  </UBadge>

  <!-- SELECTOR VIEW MODE: Badge showing current dinner mode selection -->
  <UBadge
    v-else-if="!isTitle && formMode === FORM_MODES.VIEW"
    :color="getBadgeColor()"
    :variant="getBadgeVariant()"
    :size="size"
    :name="name"
    :data-testid="name"
  >
    <UIcon :name="getModeIcon()" :class="WEEKDAY_BADGE_CONTENT_SIZE" />
    <span v-if="showLabel" class="ml-1">{{ getModeLabel() }}</span>
  </UBadge>

  <!-- SELECTOR EDIT MODE: Button group for dinner mode selection -->
  <UFieldGroup
    v-else-if="!isTitle && formMode === FORM_MODES.EDIT"
    :size="size"
    orientation="horizontal"
    :class="FIELD_GROUP_CLASSES"
    :name="name"
    :data-testid="name"
  >
    <UButton
      v-for="mode in dinnerModeOrder"
      :key="mode"
      :icon="dinnerModeConfig[mode].icon"
      :color="getButtonColor(mode)"
      :variant="getButtonVariant(mode)"
      :disabled="disabled"
      :size="size"
      :name="`${name}-${mode}`"
      :ui="{ rounded: 'rounded-none md:rounded-md' }"
      @click="updateMode(mode)"
    />
  </UFieldGroup>
</template>
