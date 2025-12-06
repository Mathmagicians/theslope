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
import type { AllergyTypeDisplay } from '~/composables/useAllergyValidation'
import type { FormSubmitEvent } from '#ui/types'
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
const { TYPOGRAPHY, SIZES, ICONS, COLOR, DINNER_STATE_BADGES, COMPONENTS, CHEF_CALENDAR, CALENDAR, URGENCY_TO_BADGE, BACKGROUNDS, LAYOUTS } = useTheSlopeDesignSystem()

// Hero panel button colors (ChefMenuCard sits on hero background with food image)
const HERO_BUTTON = COMPONENTS.heroPanel.light

// Validation schemas
const { DinnerStateSchema, ChefMenuFormSchema } = useBookingValidation()
const DinnerState = DinnerStateSchema.enum

// Business logic from useBooking (ADR-001)
const { getStepConfig, canCancelDinner } = useBooking()

// Budget/VAT logic from useOrder (ADR-001)
const { convertVat } = useOrder()

// Time logic from useSeason (ADR-001: business logic in composables)
const { getDefaultDinnerStartTime, getDinnerTimeRange, getDeadlineUrgency } = useSeason()
const dinnerStartHour = getDefaultDinnerStartTime()

// Allergies store for allergen data
const allergiesStore = useAllergiesStore()
const { allergyTypes } = storeToRefs(allergiesStore)

// ========== COMPUTED: Mode helpers ==========

// Is the component in EDIT mode?
const isEditing = computed(() => props.formMode === FORM_MODES.EDIT)


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

// Format dates (formatDate auto-imported from ~/utils/date, uses Danish locale)
const formattedShortDate = computed(() => formatDate(props.dinnerEvent.date))

// Menu status - uses getDeadlineUrgency from useSeason
const menuStatus = computed(() => {
  const dinnerTimeRange = getDinnerTimeRange(props.dinnerEvent.date, dinnerStartHour, 0)
  const countdown = calculateCountdown(dinnerTimeRange.start)
  const urgency = getDeadlineUrgency(dinnerTimeRange.start)

  // 0 = compliant (green), 1 = warning, 2 = critical
  return {
    urgency,
    countdown,
    color: URGENCY_TO_BADGE[urgency].color
  }
})

// Format budget (use prop override or dinnerEvent.totalCost)
const budgetValue = computed(() => props.budget ?? props.dinnerEvent.totalCost)
const formattedBudget = computed(() => {
  if (!budgetValue.value) return null
  return `${Math.round(budgetValue.value / 100)} kr`
})

// Menu status badge for compact mode - derived from menuStatus
const menuStatusBadge = computed(() => {
  const { urgency, countdown } = menuStatus.value
  const badge = URGENCY_TO_BADGE[urgency]
  return {
    color: badge.color,
    label: urgency === 0 ? badge.label : countdown.formatted
  }
})

// ========== ALLERGEN STATE ==========

// Selected allergen IDs from dinner event (allergens is AllergyType[] after deserialize)
const selectedAllergenIds = computed(() => {
  if (!props.dinnerEvent?.allergens) return []
  return props.dinnerEvent.allergens.map((a: AllergyTypeDisplay) => a.id)
})

// Draft allergen selection for editing
const draftAllergenIds = ref<number[]>([])
const isEditingAllergens = ref(false)

// Sync draft when allergens change
watch(selectedAllergenIds, (newIds) => {
  draftAllergenIds.value = [...newIds]
}, { immediate: true })

// ========== FORM STATE (ChefMenuForm) ==========

const toFormState = (event: DinnerEventDetail): ChefMenuForm => ({
  menuTitle: event.menuTitle || '',
  menuDescription: event.menuDescription || '',
  totalCost: event.totalCost || 0
})

const formState = ref<ChefMenuForm>(toFormState(props.dinnerEvent))

watch(() => props.dinnerEvent, (newEvent) => {
  if (newEvent) formState.value = toFormState(newEvent)
}, { immediate: true })

// VAT config from app.config
const appConfig = useAppConfig()
const vatPercent = appConfig.theslope?.kitchen?.vatPercent ?? 25

// Cost input type: chef can enter either inkl. or ex moms
type CostInputType = 'inkl' | 'ex'
const costInputType = ref<CostInputType>('inkl')
const costTypeOptions = [
  { value: 'inkl' as CostInputType, label: 'Inkl. moms' },
  { value: 'ex' as CostInputType, label: 'Ex moms' }
]

// Computed for totalCost input (øre to kr conversion + VAT handling)
// totalCost is stored as gross (inkl. moms) in øre
const totalCostKr = computed({
  get: () => {
    const grossOre = formState.value.totalCost
    if (costInputType.value === 'ex') {
      return Math.round(convertVat(grossOre, vatPercent, true) / 100)
    }
    return Math.round(grossOre / 100)
  },
  set: (inputKr: number) => {
    const inputOre = inputKr * 100
    if (costInputType.value === 'ex') {
      formState.value.totalCost = convertVat(inputOre, vatPercent, false)
    } else {
      formState.value.totalCost = inputOre
    }
  }
})

// Display the alternative value for reference
const costAlternativeDisplay = computed(() => {
  if (!formState.value.totalCost) return null
  const grossOre = formState.value.totalCost
  const netOre = convertVat(grossOre, vatPercent, true)
  if (costInputType.value === 'inkl') {
    return `${Math.round(netOre / 100)} kr ex moms`
  }
  return `${Math.round(grossOre / 100)} kr inkl. moms`
})

const isEditingMenu = ref(false)

// Inline edit button configs - switches between edit pencil and ok/cancel
const menuEditButtons = computed(() => {
  if (!isEditing.value) return []
  if (isEditingMenu.value) {
    return [
      { icon: ICONS.check, color: HERO_BUTTON.primaryButton, variant: 'solid' as const, name: 'save-menu-inline', onClick: () => { emit('update:form', formState.value); isEditingMenu.value = false } },
      { icon: 'i-heroicons-x-mark', color: COLOR.neutral, variant: 'ghost' as const, name: 'cancel-menu-inline', onClick: handleMenuCancel }
    ]
  }
  return [
    { icon: ICONS.edit, color: HERO_BUTTON.primaryButton, variant: 'ghost' as const, name: 'edit-menu', onClick: () => { isEditingMenu.value = true } }
  ]
})

const allergenEditButtons = computed(() => {
  if (!isEditing.value) return []
  if (isEditingAllergens.value) {
    return [
      { icon: ICONS.check, color: HERO_BUTTON.primaryButton, variant: 'solid' as const, name: 'save-allergens-inline', onClick: handleAllergenSave },
      { icon: 'i-heroicons-x-mark', color: COLOR.neutral, variant: 'ghost' as const, name: 'cancel-allergens-inline', onClick: handleAllergenCancel }
    ]
  }
  return [
    { icon: ICONS.edit, color: HERO_BUTTON.primaryButton, variant: 'ghost' as const, name: 'edit-allergens', onClick: () => { isEditingAllergens.value = true } }
  ]
})

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

const handleFormSubmit = (event: FormSubmitEvent<ChefMenuForm>) => {
  emit('update:form', event.data)
  isEditingMenu.value = false
}

const handleMenuCancel = () => {
  formState.value = toFormState(props.dinnerEvent)
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
      root: `${CALENDAR.selection.card.base} ${selected ? CHEF_CALENDAR.selection : ''}`,
      body: 'p-3'
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
        :size="SIZES.small"
        class="shrink-0"
      >
        {{ stateBadge.label }}
      </UBadge>

      <!-- Menu status -->
      <UBadge
        :color="menuStatusBadge.color"
        variant="soft"
        :size="SIZES.small"
        class="shrink-0"
      >
        {{ menuStatusBadge.label }}
      </UBadge>

      <!-- Budget -->
      <div v-if="formattedBudget" class="text-sm font-medium shrink-0">
        💰 {{ formattedBudget }}
      </div>
    </div>
  </UCard>

  <!-- ========== FULL MODE (VIEW or EDIT) ========== -->
  <UCard
    v-else
    :name="`chef-menu-card-${dinnerEvent.id}`"
    :class="LAYOUTS.cardResponsive"
    :ui="{ root: 'ring-amber-500', header: `p-0 ${BACKGROUNDS.hero.mocha}` }"
  >
    <template #header>
      <DinnerDetailHeader :dinner-event="dinnerEvent" />
    </template>

    <div class="space-y-6">
      <!-- ========== MENU SECTION ========== -->
      <!-- Menu display with inline edit buttons -->
      <div v-if="!isEditingMenu">
        <UFormField :hint="isEditing ? 'Rediger menu' : undefined" :ui="{ hint: 'hidden md:block' }">
          <template #default>
            <div class="flex items-center gap-1 md:gap-2">
              <div :class="['text-lg font-medium flex-1', isMenuAnnounced ? '' : 'italic text-neutral-500']" data-testid="chef-menu-title">
                {{ menuTitle }}
              </div>
              <UButton
                v-for="btn in menuEditButtons"
                :key="btn.name"
                :icon="btn.icon"
                :color="btn.color"
                :variant="btn.variant"
                size="xs"
                square
                :name="btn.name"
                @click="btn.onClick"
              />
            </div>
          </template>
        </UFormField>
        <div v-if="dinnerEvent.menuDescription" class="text-sm text-neutral-600 dark:text-neutral-400 mt-1" data-testid="chef-menu-description">
          {{ dinnerEvent.menuDescription }}
        </div>
      </div>

      <!-- EDIT mode: Edit menu fields with Zod validation -->
      <UForm
        v-if="isEditing && isEditingMenu"
        :schema="ChefMenuFormSchema"
        :state="formState"
        class="space-y-4"
        @submit="handleFormSubmit"
      >
        <UFormField label="Menu titel" name="menuTitle" required class="w-full" hint="Hvad er aftenens ret?">
          <UInput v-model="formState.menuTitle" placeholder="f.eks. Spaghetti Carbonara" :size="SIZES.standard" name="chef-menu-title-input" class="w-full" />
        </UFormField>
        <UFormField label="Beskrivelse" name="menuDescription" class="w-full" hint="Beskriv menuen kort">
          <UTextarea v-model="formState.menuDescription" placeholder="f.eks. Cremet pasta med bacon og parmesan" :rows="3" :size="SIZES.standard" name="chef-menu-description-input" class="w-full" />
        </UFormField>
        <UFormField label="Indkøbsomkostninger" name="totalCost" class="w-full" hint="Hvad kostede indkøbene?">
          <div class="flex gap-2 items-start">
            <UInput v-model="totalCostKr" type="number" min="0" placeholder="f.eks. 450" :size="SIZES.standard" name="chef-total-cost-input" class="flex-1" />
            <USelect v-model="costInputType" :items="costTypeOptions" value-key="value" :size="SIZES.standard" name="chef-cost-type-select" class="w-32" />
          </div>
          <div v-if="costAlternativeDisplay" :class="`mt-1 ${TYPOGRAPHY.finePrint} opacity-60`">
            = {{ costAlternativeDisplay }}
          </div>
        </UFormField>
        <div class="flex gap-2 justify-end">
          <UButton :color="COLOR.neutral" variant="ghost" :size="SIZES.standard" name="cancel-menu-edit" @click="handleMenuCancel">Annuller</UButton>
          <UButton type="submit" :color="HERO_BUTTON.primaryButton" variant="solid" :size="SIZES.standard" :icon="ICONS.check" name="save-menu-edit">Gem</UButton>
        </div>
      </UForm>

      <!-- ========== ALLERGEN SECTION ========== -->
      <div v-if="showAllergens && allergyTypes.length > 0" class="pt-4 border-t">
        <UFormField :hint="isEditing ? (isEditingAllergens ? 'Gem eller annuller' : 'Rediger allergener') : undefined" :ui="{ hint: 'hidden md:block' }">
          <template #default>
            <div class="flex items-center gap-1 md:gap-2 mb-2">
              <h4 :class="`${TYPOGRAPHY.sectionSubheading} flex-1`">Allergener i menuen</h4>
              <UButton
                v-for="btn in allergenEditButtons"
                :key="btn.name"
                :icon="btn.icon"
                :color="btn.color"
                :variant="btn.variant"
                size="xs"
                square
                :name="btn.name"
                @click="btn.onClick"
              />
            </div>
          </template>
        </UFormField>

        <!-- VIEW mode: Display allergens -->
        <div v-if="!isEditingAllergens">
          <AllergenMultiSelector
            :model-value="selectedAllergenIds"
            :allergy-types="allergyTypes"
            mode="view"
            readonly
          />
        </div>

        <!-- EDIT mode: Edit allergens -->
        <div v-else>
          <AllergenMultiSelector
            v-model="draftAllergenIds"
            :allergy-types="allergyTypes"
            mode="edit"
            :show-statistics="true"
          />
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

        <!-- Status/deadline badges (shared component - broad mode with help text) -->
        <DinnerDeadlineBadges :dinner-event="dinnerEvent" />

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
            :size="SIZES.standard"
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
            :ui="{ root: 'p-2', description: 'text-xs' }"
          >
            <template #description>Indtast menu titel for at annoncere</template>
          </UAlert>

          <UButton
            v-if="canCancelDinner(dinnerEvent)"
            :color="COLOR.error"
            variant="outline"
            :size="SIZES.standard"
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
