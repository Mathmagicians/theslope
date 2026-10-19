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
 * SELECTOR VIEW MODE, cancelled (the dinner is cancelled; edit mode alike, toggle and buttons):
 * ┌─────┐
 * │-[m]-│  - The glyph on COMPONENTS.dinnerModeSelector.cancelledFace: the cancelled ticket's colours, struck through
 * └─────┘    Nothing to click: a cancelled dinner offers no mode
 *
 * SELECTOR EDIT MODE - BUTTONS (interaction="buttons", default, showLabel=true):
 * ┌────────────────────────┐
 * │ [🍽️][🕐][🛍️][❌]     │  - Icon buttons
 * └────────────────────────┘
 *        Spisesal            - Fine print label of selected mode below
 *
 * SELECTOR EDIT MODE - TOGGLE (interaction="toggle"):
 * ┌─────┐
 * │ 🍽️  │ - Single button, click cycles: DINEIN→LATE→TAKE→NONE, through the enabledModes only
 * └─────┘   Compact for grid cells (no label); disabled while no mode is enabled
 *
 * SELECTOR EDIT MODE on a plan (expected): the plan stays a ghost until it is touched; solid is a booking or an intent
 *   BUTTONS: no button selected, the plan's button hinted (COMPONENTS.dinnerModeSelector.plannedButton):
 *   ┌────────────────────────┐
 *   │ [  ][  ](mode)[  ]     │  - (mode) = the planned hint; a click picks its mode, on the hint it adopts the plan
 *   └────────────────────────┘
 *          Takeaway             - The plan's label in the expected booking's muted ink
 *   TOGGLE: the view face's expected ghost (COMPONENTS.bookingGrid.expectedBadge):
 *   ┌ ─ ─ ┐
 *     [mode]   - The first click adopts the plan (emits the shown mode), the next ones cycle as above
 *   └ ─ ─ ┘
 *
 * SELECTOR EDIT MODE - TOGGLE on a wish (ghost): the view face's ghost (COMPONENTS.waitlist.ghostBadge, the ghostInk)
 *   ┌ ─ ─ ┐
 *     [mode]   - A click cycles as above; the parent's draft then replaces the ghost
 *   └ ─ ─ ┘
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
  enabledModes?: DinnerMode[] // The modes the row may pick (getBookingOptions)
  name?: string
  showLabel?: boolean // Show mode label text below selector (both VIEW and EDIT modes)
  size?: ButtonSize
  consensus?: boolean // Power mode: true=all agree, false=mixed preferences, undefined=not power mode
  interaction?: 'buttons' | 'toggle' // buttons = show all options, toggle = click cycles through modes
  orientation?: 'horizontal' | 'vertical' | 'responsive' // Override default responsive orientation (vertical mobile, horizontal desktop)
  isModified?: boolean // Grid booking: show left border accent when cell has unsaved changes
  ghost?: boolean // The mode is a wish on the waiting list, not a booking, untouched
  expected?: boolean // The mode is the booking the preferences give a cell without an order, untouched
  cancelled?: boolean // The dinner is cancelled: the view face in every form mode, on the cancelled face
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: DinnerMode.NONE, // Default when no order exists
  formMode: FORM_MODES.VIEW,
  disabled: false,
  enabledModes: () => DINNER_MODE_ORDER,
  name: 'dinner-mode-selector',
  showLabel: false,
  size: undefined, // Falls back to responsive SIZES.small
  consensus: undefined,
  interaction: 'buttons',
  orientation: 'responsive', // Default: vertical on mobile, horizontal on desktop
  isModified: false,
  ghost: false,
  expected: false,
  cancelled: false
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

const isModeDisabled = (mode: DinnerMode): boolean => props.disabled || !props.enabledModes.includes(mode)
const isToggleDisabled = computed(() => props.disabled || props.enabledModes.length === 0)

// Update value (selector mode only)
const updateMode = (value: DinnerMode) => {
  if (props.disabled || isModeDisabled(value) || props.formMode === FORM_MODES.VIEW || isTitle.value) return
  hasUserSelected.value = true
  emit('update:modelValue', value)
}

// Toggle to the next enabled mode after the current one; with no other, the toggle stays put.
// On a plan the first click adopts the shown mode as the person's own instead
const toggleMode = () => {
  if (isToggleDisabled.value || props.formMode === FORM_MODES.VIEW || isTitle.value) return
  if (props.expected && !isModeDisabled(dinnerMode.value)) {
    hasUserSelected.value = true
    emit('update:modelValue', dinnerMode.value)
    return
  }
  const currentIndex = DINNER_MODE_ORDER.indexOf(dinnerMode.value)
  for (let i = 1; i < DINNER_MODE_ORDER.length; i++) {
    const nextIndex = (currentIndex + i) % DINNER_MODE_ORDER.length
    const nextMode = DINNER_MODE_ORDER[nextIndex]!
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
// A cancelled dinner's badge wears the cancelled face whatever the mode
const badgeFace = computed(() => props.cancelled
  ? selector.cancelledFace
  : {color: getBadgeColor(), variant: getBadgeVariant()})
// The glyph and the label of a wish or an expected booking take a muted ink; on a cancelled dinner they keep the face's
const planInk = computed(() => props.expected && !props.cancelled ? expectedFace.ink : undefined)
const inkClass = computed(() => props.ghost && !props.cancelled ? waitlistFace.ghostInk : planInk.value)

// Get mode label (VIEW mode uses mixedModeConfig when no consensus)
const getModeLabel = (): string => getViewConfig().label

type ButtonFace = {color: BadgeColor, variant: ButtonVariant}

// The toggle wears a wish's or a plan's ghost, as the view face does, until a click; else the shown mode's colour
const toggleFace = computed((): ButtonFace => {
  if (props.ghost) return waitlistFace.ghostBadge
  return props.expected
    ? {color: expectedFace.color, variant: expectedFace.variant}
    : {color: dinnerModeConfig[dinnerMode.value]!.activeColor, variant: dinnerModeConfig[dinnerMode.value]!.editActiveVariant}
})
const toggleIconClass = computed(() => inkClass.value ? `${iconSizeClass.value} ${inkClass.value}` : iconSizeClass.value)

// A button of the group: the selected mode in its colour, on a plan the plan's mode hinted and none selected
const buttonFace = (mode: DinnerMode): ButtonFace => {
  if (dinnerMode.value !== mode) return {color: COLOR.neutral, variant: dinnerModeConfig[mode]!.editInactiveVariant}
  return props.expected ? selector.plannedButton : {color: dinnerModeConfig[mode]!.activeColor, variant: dinnerModeConfig[mode]!.editActiveVariant}
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
    <!-- VIEW MODE: Badge + fine print label below; a ghost wish takes the waiting list's ghost face, a cancelled dinner the
         cancelled face in every form mode -->
    <div v-if="formMode === FORM_MODES.VIEW || cancelled" :class="selector.stack">
      <UBadge
        v-bind="badgeFace"
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
      v-bind="toggleFace"
      :icon="getModeIcon()"
      :disabled="isToggleDisabled"
      :size="responsiveSize"
      :name="name"
      :data-testid="name"
      :ui="selector.buttonUi(toggleIconClass)"
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
          v-for="mode in DINNER_MODE_ORDER"
          :key="mode"
          v-bind="buttonFace(mode)"
          :icon="dinnerModeConfig[mode]!.icon"
          :disabled="isModeDisabled(mode)"
          :size="responsiveSize"
          :data-testid="`${name}-${mode}`"
          :class="[selector.segment, shouldPulse(mode) && selector.pulse]"
          :ui="selector.buttonUi(iconSizeClass)"
          @click="updateMode(mode)"
        />
      </UFieldGroup>
      <span v-if="showLabel" :class="[TYPOGRAPHY.finePrint, planInk]">{{ getModeLabel() }}</span>
    </div>
    </template>
  </div>
</template>
