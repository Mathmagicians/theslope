<script setup lang="ts">
/**
 * ChefMenuCard - THE content provider for all dinner information
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ARCHITECTURE: Content Provider (used by DinnerDetailPanel layout container)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * ChefMenuCard is THE single source for all dinner content display and editing.
 * The chef decides the menu, so all menu content belongs here.
 *
 * PROPS:
 * - dinnerEvent: DinnerEventDetail - the dinner data
 * - formMode: FORM_MODES.VIEW | FORM_MODES.EDIT (from ~/types/form)
 * - showStateControls: boolean - show stepper, deadlines, budget, action buttons
 * - showAllergens: boolean - show allergen section
 * - isCompact: boolean - compact mode for calendar list items
 * - budget: number (øre) - budget display (optional)
 * - selected: boolean - selection state for compact mode
 *
 * SLOT:
 * - default: Page-specific content (DinnerBookingForm for household pages)
 *
 * USE CASES (formMode + showStateControls):
 * ┌──────────────┬─────────────────┬────────────────────────────────────────┐
 * │ formMode     │ showStateControls│ Use Case                              │
 * ├──────────────┼─────────────────┼────────────────────────────────────────┤
 * │ VIEW         │ false           │ Household viewing menu (+ booking slot)│
 * │ VIEW         │ true            │ Team member viewing chef's dinner     │
 * │ EDIT         │ true            │ Chef managing their dinner            │
 * └──────────────┴─────────────────┴────────────────────────────────────────┘
 *
 * COMPACT MODE (isCompact=true):
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 24/01 │ 🍝 Spaghetti Carbonara │ 🟡 PLANLAGT │ [Menu]⚠️2d │ 💰 1.500 kr │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * FULL MODE (VIEW, showStateControls=false - Household):
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ MIDDAG                                                      🟡 ANNONCERET│
 * ├──────────────────────────────────────────────────────────────────────────┤
 * │ 🍝 Spaghetti Carbonara                                                   │
 * │ Cremet pasta med bacon                                                   │
 * ├──────────────────────────────────────────────────────────────────────────┤
 * │ ALLERGENER: [🥛 Mælk] [🌾 Gluten]                                        │
 * ├──────────────────────────────────────────────────────────────────────────┤
 * │ <slot> - DinnerBookingForm (household booking)                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * FULL MODE (EDIT, showStateControls=true - Chef):
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ ADMINISTRER MIDDAGEN                                        🟡 PLANLAGT │
 * ├──────────────────────────────────────────────────────────────────────────┤
 * │ Menu titel: [Spaghetti Carbonara___________]  [✏️]                       │
 * │ Beskrivelse: [Cremet pasta med bacon_______]                             │
 * ├──────────────────────────────────────────────────────────────────────────┤
 * │ ALLERGENER: [🥛 Mælk] [🌾 Gluten]              [REDIGER ALLERGENER]     │
 * ├──────────────────────────────────────────────────────────────────────────┤
 * │ ●━━━━━━━━○━━━━━━━━○━━━━━━━━○━━━━━━━━○                                    │
 * │ PLANLAGT  ANNONCERET  BOOKING   INDKØB    AFHOLDT                        │
 * ├──────────────────────────────────────────────────────────────────────────┤
 * │ [Menu] ⚠️ Om 2d   [Indkøb] ⚠️ Om 4d   [Bestilling] ✅ Åben   💰 1.500 kr │
 * ├──────────────────────────────────────────────────────────────────────────┤
 * │ [📢 ANNONCER MENU]                                    [❌ AFLYS]         │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ADR Compliance:
 * - ADR-001: Types from validation composables, FORM_MODES from ~/types/form
 * - ADR-010: Domain types throughout
 * - Mobile-first responsive design
 * - Uses useSeason for deadline logic (no manual date calculations)
 * - Uses design system (useTheSlopeDesignSystem)
 */
import type { DinnerEventDetail, ChefMenuForm } from '~/composables/useBookingValidation'
import type { FormSubmitEvent } from '#ui/types'
import { format } from 'date-fns'
import { da } from 'date-fns/locale'
import { calculateCountdown } from '~/utils/date'
import { FORM_MODES, type FormMode } from '~/types/form'

interface Props {
  dinnerEvent: DinnerEventDetail
  formMode?: FormMode           // VIEW or EDIT (from ~/types/form)
  showStateControls?: boolean   // Show stepper, deadlines, budget, actions (chef/team member)
  showAllergens?: boolean       // Show allergen section
  isCompact?: boolean           // Compact mode for calendar list items
  budget?: number               // Budget in øre (optional override)
  selected?: boolean            // For compact mode selection state
}

const props = withDefaults(defineProps<Props>(), {
  formMode: FORM_MODES.VIEW,
  showStateControls: false,
  showAllergens: true,
  isCompact: false,
  budget: undefined,
  selected: false
})

const emit = defineEmits<{
  'update:form': [data: ChefMenuForm]
  'update:allergens': [allergenIds: number[]]
  'advance-state': [newState: string]
  'cancel-dinner': []
  select: [dinnerEventId: number]
}>()

// Design system
const { TYPOGRAPHY, SIZES, ICONS, COLOR, DINNER_STATE_BADGES, COMPONENTS } = useTheSlopeDesignSystem()

// Hero panel button colors (ChefMenuCard sits on hero background with food image)
const HERO_BUTTON = COMPONENTS.heroPanel.light

// Validation schemas
const { DinnerStateSchema, ChefMenuFormSchema } = useBookingValidation()
const DinnerState = DinnerStateSchema.enum

// Business logic from useBooking (ADR-001)
const { getStepConfig, canCancelDinner } = useBooking()

// Time logic from useSeason
const { isAnnounceMenuPastDeadline, canModifyOrders, getDefaultDinnerStartTime, getDinnerTimeRange } = useSeason()
const dinnerStartHour = getDefaultDinnerStartTime()

// Allergies store for allergen data
const allergiesStore = useAllergiesStore()
const { allergyTypes } = storeToRefs(allergiesStore)

// Deadline thresholds
const DEADLINE_THRESHOLDS = {
  WARNING: 72,
  URGENT: 24
} as const

// ========== COMPUTED: Mode helpers ==========

// Is the component in EDIT mode?
const isEditing = computed(() => props.formMode === FORM_MODES.EDIT)

// Card title based on mode
const cardTitle = computed(() => isEditing.value ? 'Administrer middagen' : 'Middag')

// ========== SHARED COMPUTEDS ==========

// State badge
const stateBadge = computed(() => {
  return DINNER_STATE_BADGES[props.dinnerEvent.state as keyof typeof DINNER_STATE_BADGES] || DINNER_STATE_BADGES.SCHEDULED
})

// Dinner step (from useBooking business logic)
const _currentStep = computed(() => getStepConfig(props.dinnerEvent).step)
const _isCancelled = computed(() => props.dinnerEvent.state === DinnerState.CANCELLED)

// Menu display
const menuTitle = computed(() => props.dinnerEvent.menuTitle || 'Menu ikke annonceret')
const isMenuAnnounced = computed(() => props.dinnerEvent.menuTitle && props.dinnerEvent.menuTitle !== 'TBD')

// Format dates
const formattedShortDate = computed(() => format(props.dinnerEvent.date, 'dd/MM', { locale: da }))

// Deadline warnings (SCHEDULED state only)
const deadlineWarnings = computed(() => {
  if (props.dinnerEvent.state !== DinnerState.SCHEDULED) return []

  const warnings: Array<{
    badge: string
    message: string
    color: string
    level: 'warning' | 'urgent' | 'critical'
  }> = []

  const dinnerTimeRange = getDinnerTimeRange(props.dinnerEvent.date, dinnerStartHour, 0)
  const countdown = calculateCountdown(dinnerTimeRange.start)

  // Menu deadline
  const isPastMenuDeadline = isAnnounceMenuPastDeadline(props.dinnerEvent.date)
  if (isPastMenuDeadline) {
    warnings.push({
      badge: 'Menu',
      message: 'Deadline overskredet',
      color: COLOR.error,
      level: 'critical'
    })
  } else if (countdown.hours < DEADLINE_THRESHOLDS.WARNING) {
    warnings.push({
      badge: 'Menu',
      message: `Om ${countdown.formatted.toLowerCase()}`,
      color: countdown.hours < DEADLINE_THRESHOLDS.URGENT ? COLOR.error : COLOR.warning,
      level: countdown.hours < DEADLINE_THRESHOLDS.URGENT ? 'urgent' : 'warning'
    })
  }

  // Grocery shopping deadline
  if (countdown.hours < DEADLINE_THRESHOLDS.WARNING && countdown.hours > 0) {
    warnings.push({
      badge: 'Indkøb',
      message: `Om ${countdown.formatted.toLowerCase()}`,
      color: countdown.hours < DEADLINE_THRESHOLDS.URGENT ? COLOR.error : COLOR.warning,
      level: countdown.hours < DEADLINE_THRESHOLDS.URGENT ? 'urgent' : 'warning'
    })
  }

  return warnings
})

// Booking status
const bookingStatus = computed(() => {
  const isOpen = canModifyOrders(props.dinnerEvent.date)
  return {
    badge: 'Bestilling',
    isOpen,
    message: isOpen ? 'Åben' : 'Lukket',
    color: isOpen ? COLOR.success : COLOR.neutral
  }
})

// Format budget (use prop override or dinnerEvent.totalCost)
const budgetValue = computed(() => props.budget ?? props.dinnerEvent.totalCost)
const formattedBudget = computed(() => {
  if (!budgetValue.value) return null
  return `${Math.round(budgetValue.value / 100)} kr`
})

// Most urgent warning for compact mode
const urgentWarning = computed(() => deadlineWarnings.value[0] || null)

// ========== ALLERGEN STATE ==========

// Selected allergen IDs from dinner event (allergens is AllergyType[] after deserialize)
const selectedAllergenIds = computed(() => {
  if (!props.dinnerEvent?.allergens) return []
  return props.dinnerEvent.allergens.map(a => a.id)
})

// Draft allergen selection for editing
const draftAllergenIds = ref<number[]>([])
const isEditingAllergens = ref(false)

// Sync draft when allergens change
watch(selectedAllergenIds, (newIds) => {
  draftAllergenIds.value = [...newIds]
}, { immediate: true })

// ========== MENU EDIT STATE ==========

const isEditingMenu = ref(false)
const draftMenuTitle = ref(props.dinnerEvent.menuTitle || '')
const draftMenuDescription = ref(props.dinnerEvent.menuDescription || '')

// Sync draft when event changes
watch(() => props.dinnerEvent, (newEvent) => {
  if (newEvent) {
    draftMenuTitle.value = newEvent.menuTitle || ''
    draftMenuDescription.value = newEvent.menuDescription || ''
  }
}, { immediate: true })

// Next state logic
const nextState = computed(() => {
  switch (props.dinnerEvent.state) {
    case DinnerState.SCHEDULED:
      return { state: DinnerState.ANNOUNCED, label: 'Annoncer menu', icon: ICONS.megaphone }
    case DinnerState.ANNOUNCED:
      return { state: DinnerState.CONSUMED, label: 'Marker som afholdt', icon: ICONS.check }
    default:
      return null
  }
})

const canAdvanceState = computed(() => {
  if (!nextState.value) return false
  if (props.dinnerEvent.state === DinnerState.SCHEDULED) {
    return !!props.dinnerEvent.menuTitle && props.dinnerEvent.menuTitle !== 'TBD'
  }
  return true
})

// ========== HANDLERS ==========

const handleMenuSave = () => {
  emit('update:menu', {
    menuTitle: draftMenuTitle.value,
    menuDescription: draftMenuDescription.value
  })
  isEditingMenu.value = false
}

const handleMenuCancel = () => {
  draftMenuTitle.value = props.dinnerEvent.menuTitle || ''
  draftMenuDescription.value = props.dinnerEvent.menuDescription || ''
  isEditingMenu.value = false
}

const handleAllergenSave = () => {
  emit('update:allergens', draftAllergenIds.value)
  isEditingAllergens.value = false
}

const handleAllergenCancel = () => {
  draftAllergenIds.value = [...selectedAllergenIds.value]
  isEditingAllergens.value = false
}

const handleAdvanceState = () => {
  if (!nextState.value || !canAdvanceState.value) return
  emit('advance-state', nextState.value.state)
}

const handleCancelDinner = () => {
  if (confirm('Er du sikker på at du vil aflyse denne middag?')) {
    emit('cancel-dinner')
  }
}

const handleCardClick = () => {
  if (props.isCompact) {
    emit('select', props.dinnerEvent.id)
  }
}
</script>

<template>
  <!-- ========== COMPACT MODE ========== -->
  <UCard
    v-if="isCompact"
    :name="`chef-menu-card-${dinnerEvent.id}`"
    :ui="{
      root: 'cursor-pointer transition-all hover:scale-[1.01]',
      ring: selected ? 'ring-2 ring-primary' : '',
      body: { padding: 'p-3' }
    }"
    @click="handleCardClick"
  >
    <div class="flex items-center gap-3">
      <!-- Date -->
      <div class="text-sm font-semibold text-primary w-12 shrink-0">
        {{ formattedShortDate }}
      </div>

      <!-- Menu title -->
      <div class="flex-1 min-w-0">
        <div :class="['text-sm truncate', isMenuAnnounced ? 'font-medium' : 'italic text-neutral-500']">
          {{ menuTitle }}
        </div>
      </div>

      <!-- State badge -->
      <UBadge
        :color="stateBadge.color"
        variant="subtle"
        :size="SIZES.small.value"
        class="shrink-0"
      >
        {{ stateBadge.label }}
      </UBadge>

      <!-- Urgent warning -->
      <UBadge
        v-if="urgentWarning"
        :color="urgentWarning.color"
        variant="soft"
        :size="SIZES.small.value"
        class="shrink-0"
      >
        {{ urgentWarning.badge }} {{ urgentWarning.message }}
      </UBadge>

      <!-- Budget -->
      <div v-if="formattedBudget" class="text-sm font-medium shrink-0">
        💰 {{ formattedBudget }}
      </div>
    </div>
  </UCard>

  <!-- ========== FULL MODE (VIEW or EDIT) ========== -->
  <UCard v-else :name="`chef-menu-card-${dinnerEvent.id}`">
    <template #header>
      <div class="flex items-start justify-between gap-2">
        <h3 :class="TYPOGRAPHY.cardTitle">{{ cardTitle }}</h3>
        <UBadge :color="stateBadge.color" :icon="stateBadge.icon" variant="subtle" :size="SIZES.small.value">
          {{ stateBadge.label }}
        </UBadge>
      </div>
    </template>

    <div class="space-y-6">
      <!-- ========== MENU SECTION ========== -->
      <!-- VIEW mode: Display menu -->
      <div v-if="!isEditing || !isEditingMenu">
        <div :class="['text-lg font-medium', isMenuAnnounced ? '' : 'italic text-neutral-500']" data-testid="chef-menu-title">
          {{ menuTitle }}
        </div>
        <div v-if="dinnerEvent.menuDescription" class="text-sm text-neutral-600 dark:text-neutral-400 mt-1" data-testid="chef-menu-description">
          {{ dinnerEvent.menuDescription }}
        </div>
        <!-- Edit button (EDIT mode only, when not already editing) -->
        <UButton
          v-if="isEditing && !isEditingMenu"
          :icon="ICONS.edit"
          :color="COLOR.neutral"
          variant="ghost"
          size="xs"
          name="edit-menu"
          class="mt-2"
          @click="isEditingMenu = true"
        >
          Rediger menu
        </UButton>
      </div>

      <!-- EDIT mode: Edit menu fields -->
      <div v-if="isEditing && isEditingMenu" class="space-y-4">
        <UFormField label="Menu titel" required>
          <UInput v-model="draftMenuTitle" placeholder="Indtast menu titel" :size="SIZES.standard.value" data-testid="chef-menu-title-input" />
        </UFormField>
        <UFormField label="Beskrivelse (valgfri)">
          <UTextarea v-model="draftMenuDescription" placeholder="Tilføj en beskrivelse af menuen" :rows="3" :size="SIZES.standard.value" data-testid="chef-menu-description-input" />
        </UFormField>
        <div class="flex gap-2 justify-end">
          <UButton :color="COLOR.neutral" variant="ghost" :size="SIZES.standard.value" name="cancel-menu-edit" @click="handleMenuCancel">Annuller</UButton>
          <UButton :color="HERO_BUTTON.primaryButton" variant="solid" :size="SIZES.standard.value" :icon="ICONS.check" name="save-menu-edit" :disabled="!draftMenuTitle.trim()" @click="handleMenuSave">Gem</UButton>
        </div>
      </div>

      <!-- ========== ALLERGEN SECTION ========== -->
      <div v-if="showAllergens && allergyTypes.length > 0" class="pt-4 border-t">
        <h4 :class="`${TYPOGRAPHY.label} mb-2`">Allergener i menuen</h4>

        <!-- VIEW mode: Display allergens -->
        <div v-if="!isEditingAllergens">
          <AllergenMultiSelector
            :model-value="selectedAllergenIds"
            :allergy-types="allergyTypes"
            mode="view"
            readonly
          />
          <!-- Edit button (EDIT mode only) -->
          <UButton
            v-if="isEditing"
            :icon="ICONS.edit"
            :color="COLOR.neutral"
            variant="ghost"
            size="xs"
            name="edit-allergens"
            class="mt-2"
            @click="isEditingAllergens = true"
          >
            Rediger allergener
          </UButton>
        </div>

        <!-- EDIT mode: Edit allergens -->
        <div v-else class="space-y-4">
          <AllergenMultiSelector
            v-model="draftAllergenIds"
            :allergy-types="allergyTypes"
            mode="edit"
            :show-statistics="true"
          />
          <div class="flex gap-2 justify-end">
            <UButton :color="COLOR.neutral" variant="ghost" :size="SIZES.standard.value" name="cancel-allergen-edit" @click="handleAllergenCancel">Annuller</UButton>
            <UButton :color="HERO_BUTTON.primaryButton" variant="solid" :size="SIZES.standard.value" :icon="ICONS.check" name="save-allergen-edit" @click="handleAllergenSave">Gem</UButton>
          </div>
        </div>
      </div>

      <!-- ========== PAGE-SPECIFIC CONTENT (slot) ========== -->
      <div v-if="$slots.default" class="pt-4 border-t">
        <slot />
      </div>

      <!-- ========== STATE CONTROLS (showStateControls only) ========== -->
      <template v-if="showStateControls">
        <!-- Status stepper -->
        <div class="pt-4 border-t">
          <DinnerStatusStepper
            :dinner-event="dinnerEvent"
            :mode="isEditing ? 'full' : 'compact'"
            :show-deadlines="isEditing"
          />
        </div>

        <!-- Deadline warnings row -->
        <div v-if="deadlineWarnings.length > 0 || dinnerEvent.state === DinnerState.SCHEDULED" class="flex flex-wrap items-center gap-2 text-sm">
          <div v-for="warning in deadlineWarnings" :key="warning.badge" class="flex items-center gap-1">
            <UBadge :color="warning.color" variant="soft" :size="SIZES.small.value">{{ warning.badge }}</UBadge>
            <span :class="warning.level === 'critical' ? 'text-error font-medium' : ''">{{ warning.message }}</span>
          </div>
          <div v-if="dinnerEvent.state === DinnerState.SCHEDULED" class="flex items-center gap-1">
            <UBadge :color="bookingStatus.color" variant="soft" :size="SIZES.small.value">{{ bookingStatus.badge }}</UBadge>
            <span>{{ bookingStatus.message }}</span>
          </div>
        </div>

        <!-- Budget section (chef's financial overview) -->
        <div class="pt-4 border-t">
          <DinnerBudget :orders="dinnerEvent.tickets ?? []" mode="full" />
        </div>

        <!-- Action buttons (EDIT mode only) -->
        <div v-if="isEditing" class="pt-4 border-t space-y-2">
          <UButton
            v-if="nextState"
            :color="canAdvanceState ? HERO_BUTTON.primaryButton : COLOR.neutral"
            variant="solid"
            :size="SIZES.standard.value"
            :icon="nextState.icon"
            :disabled="!canAdvanceState"
            block
            name="advance-dinner-state"
            @click="handleAdvanceState"
          >
            {{ nextState.label }}
          </UButton>

          <UAlert
            v-if="nextState && !canAdvanceState && dinnerEvent.state === DinnerState.SCHEDULED"
            :color="COLOR.warning"
            variant="soft"
            icon="i-heroicons-information-circle"
            :ui="{ padding: 'p-2', description: 'text-xs' }"
          >
            <template #description>Indtast menu titel for at annoncere</template>
          </UAlert>

          <UButton
            v-if="canCancelDinner(dinnerEvent)"
            :color="COLOR.error"
            variant="outline"
            :size="SIZES.standard.value"
            icon="i-heroicons-x-mark"
            block
            name="cancel-dinner"
            @click="handleCancelDinner"
          >
            Aflys middag
          </UButton>
        </div>
      </template>
    </div>
  </UCard>
</template>
