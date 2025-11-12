<script setup lang="ts">
/**
 * WeekDayMapDinnerModeDisplay - Display and edit DinnerMode preferences for each weekday
 *
 * Used in HouseholdCard expandable table rows
 *
 * VIEW MODE (collapsed row):
 * ┌────────────────────────────────────┐
 * │ Mon Tue Wed Thu Fri                │
 * │ 🍽️  🍽️  🍽️  🍽️  🛍️              │
 * └────────────────────────────────────┘
 * - Compact badges 
 * - Colors: success (eating), error (none)
 * - Read-only (no interaction)
 *
 * EDIT MODE (expanded row):
 * ┌────────────────────────────────────────────────────────────────┐
 * │ Mon: [🍽️ Spis][🕐 Sen][🛍️ Takeaway][❌ Ingen]              │
 * │      ^^^^^^^^^ ^^^^^^^^ ^^^^^^^^^^^^ ^^^^^^^^^^^^              │
 * │      active   inactive  inactive     inactive                 │
 * │      solid    ghost     ghost        ghost                    │
 * │      success  neutral   neutral      neutral                  │
 * │                                                                │
 * │ Tue: [🍽️ Spis][🕐 Sen][🛍️ Takeaway][❌ Ingen]              │
 * │ Wed: [🍽️ Spis][🕐 Sen][🛍️ Takeaway][❌ Ingen]              │
 * │ Thu: [🍽️ Spis][🕐 Sen][🛍️ Takeaway][❌ Ingen]              │
 * │ Fri: [🍽️ Spis][🕐 Sen][🛍️ Takeaway][❌ Ingen]              │
 * └────────────────────────────────────────────────────────────────┘
 *
 */
import {WEEKDAYS} from '~/types/dateTypes'
import type {WeekDayMap, WeekDay} from '~/types/dateTypes'
import type {DinnerMode} from '~/composables/useDinnerEventValidation'
import {FORM_MODES, type FormMode} from '~/types/form'
import {FIELD_GROUP_CLASSES, WEEKDAY_FIELD_GROUP_CLASSES, WEEKDAY_BADGE_CONTENT_SIZE} from '~/utils/form'
import {formatWeekdayCompact} from '~/utils/date'
import type Badge from '#ui/components/Badge.vue'

type BadgeColor = Badge['variants']['color']

interface Props {
  modelValue?: WeekDayMap<DinnerMode> | null
  formMode?: FormMode
  disabled?: boolean
  name?: string
  parentRestriction?: WeekDayMap | null // Filter which weekdays to display (e.g., season cooking days)
  showLabels?: boolean // Whether to show weekday labels (default true for standalone, false for table)
}

const props = withDefaults(defineProps<Props>(), {
  formMode: FORM_MODES.VIEW,
  disabled: false,
  parentRestriction: null,
  showLabels: true
})

const emit = defineEmits<{
  'update:modelValue': [value: WeekDayMap<DinnerMode>]
}>()

// Inject responsive breakpoint
const isMd = inject<Ref<boolean>>('isMd')
const getIsMd = computed((): boolean => isMd?.value ?? false)

// Responsive size for badges and buttons (matches header and VIEW mode)
const componentSize = computed(() => getIsMd.value ? 'md' : 'sm')

const {DinnerModeSchema} = useDinnerEventValidation()

// Extract enum constants from Zod schema
const DinnerMode = DinnerModeSchema.enum

const {createDefaultWeekdayMap} = useWeekDayMapValidation({
  valueSchema: DinnerModeSchema,
  defaultValue: DinnerMode.DINEIN
})

// Dinner mode display config (order determines button/cycle order)
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
  viewVariant: 'solid' | 'ghost' | 'outline'  // VIEW mode (display only)
  editActiveVariant: 'solid' | 'ghost'        // EDIT mode when selected
  editInactiveVariant: 'solid' | 'ghost'      // EDIT mode when not selected
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
    viewVariant: 'ghost',               // VIEW: subtle (no dinner)
    editActiveVariant: 'solid',         // EDIT: clearly visible when selected
    editInactiveVariant: 'ghost'
  }
}

// Update local model value
const updateDay = (day: WeekDay, value: DinnerMode) => {
  if (props.disabled || props.formMode === FORM_MODES.VIEW) return

  // Initialize with all days set to DINEIN if modelValue is null/undefined
  const updated: WeekDayMap<DinnerMode> = props.modelValue
    ? {...props.modelValue}
    : createDefaultWeekdayMap(DinnerMode.DINEIN)

  updated[day] = value
  emit('update:modelValue', updated)
}

// Get icon for a mode
const getModeIcon = (mode: DinnerMode): string => {
  return dinnerModeConfig[mode].icon
}

// Get badge color for VIEW mode (uses same color as EDIT mode)
const getBadgeColor = (mode: DinnerMode): BadgeColor => {
  return dinnerModeConfig[mode].activeColor
}

// Get badge variant for VIEW mode
const getBadgeVariant = (mode: DinnerMode): 'solid' | 'ghost' | 'outline' => {
  return dinnerModeConfig[mode].viewVariant
}

// Get button color for EDIT mode (active vs inactive)
const getButtonColor = (day: WeekDay, mode: DinnerMode): BadgeColor => {
  const currentMode = props.modelValue?.[day] ?? DinnerMode.DINEIN
  const isActive = currentMode === mode
  return isActive ? dinnerModeConfig[mode].activeColor : 'neutral'
}

// Get button variant for EDIT mode (active vs inactive)
const getButtonVariant = (day: WeekDay, mode: DinnerMode): 'solid' | 'ghost' => {
  const currentMode = props.modelValue?.[day] ?? DinnerMode.DINEIN
  const isActive = currentMode === mode
  return isActive ? dinnerModeConfig[mode].editActiveVariant : dinnerModeConfig[mode].editInactiveVariant
}

// Filter weekdays based on parent restriction (e.g., season cooking days)
const visibleDays = computed(() => {
  if (!props.parentRestriction) return WEEKDAYS
  return WEEKDAYS.filter(day => props.parentRestriction![day])
})
</script>

<template>
  <!-- VIEW MODE: Horizontal compact display with badges - filtered weekdays only -->
<UFieldGroup v-if="formMode === FORM_MODES.VIEW" :size="componentSize" orientation="horizontal" :class="WEEKDAY_FIELD_GROUP_CLASSES">
    <div
      v-for="day in visibleDays"
      :key="day"
    >
      <UBadge
        :color="getBadgeColor(modelValue?.[day] ?? DinnerMode.DINEIN)"
        :variant="getBadgeVariant(modelValue?.[day] ?? DinnerMode.DINEIN)"
        :ui="{ rounded: 'rounded-none md:rounded-md' }"
      >
        <UIcon
          :name="getModeIcon(modelValue?.[day] ?? DinnerMode.DINEIN)"
          :class="WEEKDAY_BADGE_CONTENT_SIZE"
        />
      </UBadge>
    </div>
  </UFieldGroup>

  <!-- EDIT MODE: Responsive button groups (vertical on mobile, horizontal on desktop) -->
  <div v-else-if="formMode === FORM_MODES.EDIT" class="flex gap-2 md:gap-4 flex-wrap">
    <div v-for="day in visibleDays" :key="day" class="flex flex-col items-center gap-2">
      <span v-if="showLabels" class="text-xs font-semibold text-gray-600 capitalize">{{ formatWeekdayCompact(day) }}</span>
      <UFieldGroup :size="componentSize" :orientation="getIsMd ? 'horizontal' : 'vertical'" :class="FIELD_GROUP_CLASSES">
        <UButton
          v-for="mode in dinnerModeOrder"
          :key="mode"
          :icon="dinnerModeConfig[mode].icon"
          :color="getButtonColor(day, mode)"
          :variant="getButtonVariant(day, mode)"
          :disabled="disabled"
          :size="componentSize"
          :name="`${name}-${day}-${mode}`"
          :ui="{ rounded: 'rounded-none md:rounded-md' }"
          @click="updateDay(day, mode)"
        />
      </UFieldGroup>
    </div>
  </div>
</template>
