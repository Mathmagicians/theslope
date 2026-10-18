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
 * SELECTOR VIEW MODE (modelValue is DinnerMode, showLabel=true):
 * ┌─────┐
 * │ 🍽️  │  - Badge showing current selection
 * └─────┘
 * Spisesal   - Fine print label below
 *
 * SELECTOR VIEW MODE, ghost (a wish on the waiting list):
 * ┌ ─ ─ ┐
 *   [mode]   - The same glyph on COMPONENTS.waitlist.ghostBadge: no fill, the muted ghostInk
 * └ ─ ─ ┘
 * Spisesal   - The label in the same ink
 *
 * SELECTOR VIEW MODE, expected (no order yet: the booking the preferences give the cell):
 * ┌ ─ ─ ┐
 *   [mode]   - The glyph ghosted on the waiting list's neutral (COMPONENTS.bookingGrid.expectedBadge), in its muted ink
 * └ ─ ─ ┘
 * Spisesal   - The label in the same ink
 *
 * SELECTOR EDIT MODE - BUTTONS (interaction="buttons", default, showLabel=true):
 * ┌────────────────────────┐
 * │ [🍽️][🕐][🛍️][❌]     │  - Icon buttons
 * └────────────────────────┘
 *        Spisesal            - Fine print label of selected mode below
 *
 * SELECTOR EDIT MODE - TOGGLE (interaction="toggle"):
 * ┌─────┐
 * │ 🍽️  │ - Single button, click cycles: DINEIN→LATE→TAKE→NONE
 * └─────┘   Compact for grid cells (no label)
 */
import {DinnerMode} from '~/composables/useBookingValidation'
import {BOOKING_WORDS} from '~/config/bookingWords'
import {WEEKDAYS, type WeekDay} from '~/types/dateTypes'
import {FORM_MODES, type FormMode} from '~/types/form'
import type {BadgeProps, ButtonProps} from '@nuxt/ui'

type BadgeColor = NonNullable<BadgeProps['color']>
type BadgeVariant = NonNullable<BadgeProps['variant']>
type ButtonSize = NonNullable<ButtonProps['size']>
type ButtonVariant = NonNullable<ButtonProps['variant']>

interface Props {
  modelValue?: WeekDay | DinnerMode // Optional - defaults to NONE when no order exists
  formMode?: FormMode
  disabled?: boolean
  disabledModes?: DinnerMode[] // Specific modes to disable (e.g., after deadline)
  name?: string
  showLabel?: boolean // Show mode label text below selector (both VIEW and EDIT modes)
  size?: ButtonSize
  consensus?: boolean // Power mode: true=all agree, false=mixed preferences, undefined=not power mode
  interaction?: 'buttons' | 'toggle' // buttons = show all options, toggle = click cycles through modes
  orientation?: 'horizontal' | 'vertical' | 'responsive' // Override default responsive orientation (vertical mobile, horizontal desktop)
  isModified?: boolean // Grid booking: show left border accent when cell has unsaved changes
  ghost?: boolean // View mode: the mode is a wish on the waiting list, not a booking
  expected?: boolean // View mode: the mode is the booking the preferences give a cell without an order
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: DinnerMode.NONE, // Default when no order exists
  formMode: FORM_MODES.VIEW,
  disabled: false,
  disabledModes: () => [],
  name: 'dinner-mode-selector',
  showLabel: false,
  size: undefined, // Falls back to responsive SIZES.small
  consensus: undefined,
  interaction: 'buttons',
  orientation: 'responsive', // Default: vertical on mobile, horizontal on desktop
  isModified: false,
  ghost: false,
  expected: false
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
const { WEEKDAY, ORIENTATIONS, ICONS, SIZES, TYPOGRAPHY, COMPONENTS, COLOR, NOISE } = useTheSlopeDesignSystem()
const selector = COMPONENTS.dinnerModeSelector
const waitlistFace = COMPONENTS.waitlist
const expectedFace = COMPONENTS.bookingGrid.expectedBadge

// Responsive size: use prop if provided, otherwise use responsive default
const responsiveSize = computed(() => props.size ?? SIZES.small)

// Icon size class based on size prop (scales with button/badge size); without a size it follows the weekday badge
const iconSizeClass = computed(() => {
  const size = props.size
  return size && size in selector.iconSize ? selector.iconSize[size as keyof typeof selector.iconSize] : WEEKDAY.badgeContentSize
})

// Determine if we're in title mode (showing weekday) or selector mode (showing dinner mode)
const isTitle = computed(() => WEEKDAYS.includes(props.modelValue as WeekDay))

// Button orientation: use prop override if provided, otherwise responsive (vertical mobile, horizontal desktop)
const buttonOrientation = computed(() => {
  if (props.orientation === 'responsive') return ORIENTATIONS.responsive.value
  return props.orientation
})

// Dinner mode order for iteration
const dinnerModeOrder: DinnerMode[] = [
  DinnerMode.DINEIN,
  DinnerMode.DINEINLATE,
  DinnerMode.TAKEAWAY,
  DinnerMode.NONE
]

// Display config type
type ModeDisplayConfig = {
  label: string
  icon: string
  activeColor: BadgeColor
  viewVariant: BadgeVariant
  editActiveVariant: ButtonVariant
  editInactiveVariant: ButtonVariant
}

// Dinner mode display config: the words (label, glyph) come from MODE_WORDS, the colours and variants live here
const dinnerModeConfig: Record<DinnerMode, ModeDisplayConfig> = {
  [DinnerMode.DINEIN]: {
    ...MODE_WORDS[DinnerMode.DINEIN],
    activeColor: COLOR.success,
    viewVariant: NOISE.loud,
    editActiveVariant: NOISE.loud,
    editInactiveVariant: NOISE.soft
  },
  [DinnerMode.DINEINLATE]: {
    ...MODE_WORDS[DinnerMode.DINEINLATE],
    activeColor: COLOR.success,
    viewVariant: NOISE.loud,
    editActiveVariant: NOISE.loud,
    editInactiveVariant: NOISE.soft
  },
  [DinnerMode.TAKEAWAY]: {
    ...MODE_WORDS[DinnerMode.TAKEAWAY],
    activeColor: COLOR.success,
    viewVariant: NOISE.loud,
    editActiveVariant: NOISE.loud,
    editInactiveVariant: NOISE.soft
  },
  [DinnerMode.NONE]: {
    ...MODE_WORDS[DinnerMode.NONE],
    activeColor: COLOR.error,
    viewVariant: NOISE.soft,
    editActiveVariant: NOISE.soft,
    editInactiveVariant: NOISE.quiet
  }
}

// Mixed/no consensus config (used when consensus === false)
const mixedModeConfig: ModeDisplayConfig = {
  label: BOOKING_WORDS.mixedModes,
  icon: ICONS.help,
  activeColor: COLOR.neutral,
  viewVariant: NOISE.medium,
  editActiveVariant: NOISE.medium,
  editInactiveVariant: NOISE.quiet
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

// Get effective config - uses mixedModeConfig when consensus === false (VIEW mode only)
const getViewConfig = (): ModeDisplayConfig => {
  if (props.consensus === false) return mixedModeConfig
  return dinnerModeConfig[dinnerMode.value]!
}

// Get icon for current mode (VIEW mode uses mixedModeConfig when no consensus)
const getModeIcon = (): string => getViewConfig().icon

// VIEW mode badge: the mode's colour and variant, the ghost of a wish on the waiting list, or an expected booking's ghost
const getBadgeColor = (): BadgeColor => {
  if (props.ghost) return waitlistFace.ghostBadge.color
  return props.expected ? expectedFace.color : getViewConfig().activeColor
}
const getBadgeVariant = (): BadgeVariant => {
  if (props.ghost) return waitlistFace.ghostBadge.variant
  return props.expected ? expectedFace.variant : getViewConfig().viewVariant
}
// The glyph and the label of a wish or an expected booking take a muted ink
const inkClass = computed(() => props.ghost ? waitlistFace.ghostInk : props.expected ? expectedFace.ink : undefined)

// Get mode label (VIEW mode uses mixedModeConfig when no consensus)
const getModeLabel = (): string => getViewConfig().label

// Get button color for EDIT mode (active vs inactive)
const getButtonColor = (mode: DinnerMode): BadgeColor => {
  const isActive = dinnerMode.value === mode
  return isActive ? dinnerModeConfig[mode]!.activeColor : COLOR.neutral
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
</script>

<template>
  <div :class="isModified && selector.modified">
    <!-- TITLE MODE: Weekday header badge -->
    <template v-if="isTitle">
      <UBadge
        v-bind="WEEKDAY.titleBadgeProps"
        :size="responsiveSize"
        :name="name"
        :data-testid="name"
      >
        <div :class="[iconSizeClass, selector.weekdayLabel]">
          {{ WEEKDAY.getLabel(modelValue as WeekDay) }}
        </div>
      </UBadge>
    </template>

    <!-- SELECTOR MODE: Dinner mode selection -->
    <template v-else>
    <!-- VIEW MODE: Badge + fine print label below; a ghost wish takes the waiting list's ghost face -->
    <div v-if="formMode === FORM_MODES.VIEW" :class="selector.stack">
      <UBadge
        :color="getBadgeColor()"
        :variant="getBadgeVariant()"
        :size="responsiveSize"
        :class="selector.segment"
        :name="name"
        :data-testid="name"
      >
        <UIcon :name="getModeIcon()" :class="[iconSizeClass, inkClass]" />
      </UBadge>
      <span v-if="showLabel" :class="[TYPOGRAPHY.finePrint, inkClass]">{{ getModeLabel() }}</span>
    </div>

    <!-- EDIT MODE: Toggle (single button, click cycles) - no label for compact grid use -->
    <UButton
      v-else-if="formMode === FORM_MODES.EDIT && interaction === 'toggle'"
      :icon="getModeIcon()"
      :color="dinnerModeConfig[dinnerMode]!.activeColor"
      :variant="dinnerModeConfig[dinnerMode]!.editActiveVariant"
      :disabled="disabled"
      :size="responsiveSize"
      :name="name"
      :data-testid="name"
      :ui="selector.buttonUi(iconSizeClass)"
      @click="toggleMode"
    />

    <!-- EDIT MODE: Button group + fine print label below -->
    <div v-else-if="formMode === FORM_MODES.EDIT" :class="selector.stack">
      <UFieldGroup
        :size="responsiveSize"
        :orientation="buttonOrientation"
        :class="selector.fieldGroup"
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
          :size="responsiveSize"
          :data-testid="`${name}-${mode}`"
          :class="[selector.segment, shouldPulse(mode) && selector.pulse]"
          :ui="selector.buttonUi(iconSizeClass)"
          @click="updateMode(mode)"
        />
      </UFieldGroup>
      <span v-if="showLabel" :class="TYPOGRAPHY.finePrint">{{ getModeLabel() }}</span>
    </div>
    </template>
  </div>
</template>
