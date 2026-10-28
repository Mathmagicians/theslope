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
 * │ (allergy) ALLERGENER   3,5 kuv. | (milk) Mælk · 2,5 | (wheat) Gluten · 0 │
 * │ (allergy) ALLERGENER   🥗 Menuen er fri for allergener...  (no allergen) │
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
 * │ (allergy) ALLERGENER 3,5 kuv. | (milk) Mælk · 2,5  [Rediger allergener]  │
 * │   the editor: AllergenMultiSelector on this dinner's tickets             │
 * ├──────────────────────────────────────────────────────────────────────────┤
 * │ (cart) MADBESTILLING  1.310 / 1.638 kr        [Rediger madbestilling]    │
 * │   the editor: ExpenseLines with the helping numbers and the lines        │
 * ├──────────────────────────────────────────────────────────────────────────┤
 * │ ●━━━━━━━━○━━━━━━━━○━━━━━━━━○━━━━━━━━○                                    │
 * │ PLANLAGT  ANNONCERET  BOOKING   INDKØB    AFHOLDT                        │
 * ├──────────────────────────────────────────────────────────────────────────┤
 * │ [Menu] ⚠️ Om 2d   [Indkøb] ⚠️ Om 4d   [Bestilling] ✅ Åben   💰 1.500 kr │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Action row noise ladder (NOISE: loud -> medium) - matches use frequency:
 *   [edit menu] solid primary | [publish] outline secondary | [⚙ ▾] outline settings wheel
 * The ⚙ ▾ trigger (BUTTONS.settings + chevron) reveals the Flere panel: Frigiv portioner above a
 * danger zone holding the rare cancel-dinner action.
 *
 * RELEASE PORTIONS (EDIT, the queue on the dinner) - one form, two triggers:
 *   [Rediger menu] [Annoncer] [Flere v]
 *                              +- Frigiv portioner          permanent entry in the Flere panel
 *   +----------------------------------------------------------------+
 *   | [hourglass] 2V 2B på venteliste · 2,5 portioner                |  ALERTS.info + withActions, only while
 *   |     Skrånere mangler billetter til din middag — har du         |  the queue has entries; one entry reads
 *   |     mulighed for at mætte flere munde?    [Frigiv portioner]   |  "En skråner mangler billet"
 *   +----------------------------------------------------------------+
 *   form:  Kan du frigive [ 2,5 ] portioner?  [Frigiv] [Fortryd]     UForm on ExtraPortionsRequestSchema,
 *                                                                    prefilled with the queue's portion need
 *
 * ADR Compliance:
 * - ADR-001: Types from validation composables, FORM_MODES from ~/types/form
 * - ADR-010: Domain types throughout
 * - Mobile-first responsive design
 * - Uses useSeason for deadline logic (no manual date calculations)
 * - Uses design system (useTheSlopeDesignSystem)
 */
import type { DinnerEventDetail, ChefMenuForm } from '~/composables/useBookingValidation'
import type { ExpenseCreate } from '~/composables/useBillingValidation'
import {cookingRoundWords, dinnerSpendingFragment, teamSpendingFragment, SUPPLY_WORDS, type CookingRoundRow} from '~/composables/useBookingUi'
import type { AllergyTypeDisplay } from '~/composables/useAllergyValidation'
import type { SeasonDeadlines } from '~/composables/useSeason'
import type { NuxtUIColor } from '~/composables/useTheSlopeDesignSystem'
import type { Form, FormSubmitEvent } from '#ui/types'
import type { WaitlistQueueSummary, ExtraPortionsRequest } from '~/composables/useWaitlistValidation'
import { FORM_MODES, type FormMode } from '~/types/form'
import { BOOKING_WORDS } from '~/config/bookingWords'

interface Props {
  dinnerEvent: DinnerEventDetail
  deadlines: SeasonDeadlines
  formMode?: FormMode           // VIEW or EDIT (from ~/types/form)
  showStateControls?: boolean   // Show stepper, deadlines, budget, actions (chef/team member)
  showAllergens?: boolean       // Show allergen section
  isCompact?: boolean           // Compact mode for calendar list items
  budget?: number               // Budget in øre (optional override)
  selected?: boolean            // For compact mode selection state
  isUpdating?: boolean          // Loading state for all edit buttons
  hasPrev?: boolean             // Navigation: has previous dinner
  hasNext?: boolean             // Navigation: has next dinner
  calendarOpen?: boolean        // Calendar accordion state
  navColor?: NuxtUIColor        // Navigation button color
  roundRows?: CookingRoundRow[] // The team's cooking round around this dinner (chef page)
  teamNumber?: number | null    // The cooking team's number in the season, its badge's colour in the round (chef page)
  expenseNote?: string          // The words a grocery line's note starts with (expenseNoteWords, built by the page)
  waitlist?: WaitlistQueueSummary | null // The dinner's queue: its size and portion need (chef page)
}

const props = withDefaults(defineProps<Props>(), {
  formMode: FORM_MODES.VIEW,
  showStateControls: false,
  showAllergens: true,
  isCompact: false,
  budget: undefined,
  selected: false,
  isUpdating: false,
  hasPrev: false,
  hasNext: false,
  calendarOpen: false,
  navColor: undefined,
  roundRows: () => [],
  teamNumber: null,
  expenseNote: '',
  waitlist: null
})

const emit = defineEmits<{
  'update:form': [data: ChefMenuForm]
  'update:allergens': [allergenIds: number[]]
  'advance-state': [newState: string]
  /** The chef's grocery lines (DinnerBudget → ExpenseLines); the page calls the bookings store */
  'add-expense': [line: ExpenseCreate]
  'remove-expense': [expenseId: number]
  /** The chef cooks more portions for the waiting list; the page calls the bookings store */
  'extra-portions': [portions: number]
  'cancel-dinner': []
  'undo-cancel-dinner': []
  'toggle-calendar': []
  /** Bubbled from RoleAssignment when the chef is claimed/changed/removed. Parent should refresh the dinner. */
  'role-assigned': []
  'role-removed': []
  prev: []
  next: []
  select: [dinnerEventId: number]
}>()

// Design system
const { TYPOGRAPHY, SIZES, ICONS, ALERTS, BUTTONS, DINNER_STATE_BADGES, COMPONENTS, URGENCY_TO_BADGE, LAYOUTS, TEXT, NOISE, COLOR, getRandomEmptyMessage } = useTheSlopeDesignSystem()

// Hero panel button colors (ChefMenuCard sits on hero background with food image)
const HERO_BUTTON = COMPONENTS.heroPanel.light

// Validation schemas
const { DinnerStateSchema, ChefMenuFormSchema } = useBookingValidation()
const { TeamRoleSchema } = useCookingTeamValidation()
const roleAssignmentRef = ref<{open: () => void} | null>(null)
const DinnerState = DinnerStateSchema.enum
const TeamRole = TeamRoleSchema.enum

// Business logic from useBooking (ADR-001)
const { getStepConfig, canCancelDinner } = useBooking()

// Name formatting from useHousehold (ADR-001)
const { formatNameWithInitials } = useHousehold()

// The dinner's money: the expense lines' helping numbers read it, the Budget pane shows it
const {calculateBudget} = useOrder()
const kitchenConfig = useAppConfig().theslope?.kitchen
const budget = computed(() => calculateBudget(props.dinnerEvent.tickets ?? [], kitchenConfig?.baseRatePercent ?? 5, kitchenConfig?.vatPercent ?? 25))
// The round's figure matters when the team cooks several days in a row
// The round's words, built once for the Madbestilling hint and the Budget pane's round table
const {getTeamShortName} = useCookingTeam()
const roundWords = computed(() => {
  const first = props.roundRows[0]
  const last = props.roundRows.at(-1)
  if (props.roundRows.length <= 1 || !first || !last || !props.dinnerEvent.cookingTeam || props.teamNumber === null) return null
  return cookingRoundWords(getTeamShortName(props.dinnerEvent.cookingTeam.name), props.teamNumber, first.date, last.date)
})
// The spending fragments, built once: this dinner's receipts and the team's round, for the editor's sums and the Budget pane
const ownRow = computed(() => props.roundRows.find(row => row.isCurrent) ?? null)
const dinnerFragment = computed(() => ownRow.value ? dinnerSpendingFragment(ownRow.value, props.dinnerEvent.expenses) : null)
const teamFragment = computed(() => roundWords.value ? teamSpendingFragment(props.roundRows, roundWords.value) : null)
const round = computed(() => roundWords.value && teamFragment.value ? {label: roundWords.value.heading, figures: teamFragment.value.total.figures} : null)
const bookingDeadline = computed(() => props.deadlines.getBookingDeadlineTime(props.dinnerEvent.date))

// Time logic from useSeason (ADR-001: business logic in composables)
const { getDefaultDinnerStartTime, getDinnerTimeRange, getDeadlineUrgency } = useSeason()
const dinnerStartHour = getDefaultDinnerStartTime()
// The page's clock: the server and the browser count down from the same moment
const now = useClock()

// Allergies store for allergen data
const allergiesStore = useAllergiesStore()
const { allergyTypes } = storeToRefs(allergiesStore)

// The menu's allergens on this dinner's diners (ADR-001)
const { computeAllergenOverview } = useAllergy()

// ========== COMPUTED: Mode helpers ==========

// Is the component in EDIT mode?
const isEditing = computed(() => props.formMode === FORM_MODES.EDIT)


// ========== SHARED COMPUTEDS ==========

// State badge
const stateBadge = computed(() => {
  return DINNER_STATE_BADGES[props.dinnerEvent.state as keyof typeof DINNER_STATE_BADGES] || DINNER_STATE_BADGES.SCHEDULED
})

// Dinner step (from useBooking business logic)
const _currentStep = computed(() => getStepConfig(props.dinnerEvent, props.deadlines).step)
const isCancelled = computed(() => isDinnerCancelled(props.dinnerEvent))

// Menu display
const hasMenuTitle = computed(() => !!props.dinnerEvent.menuTitle?.trim())
const menuTitle = computed(() => hasMenuTitle.value ? props.dinnerEvent.menuTitle : 'Chefkokken har ikke fundet på en god menu endnu')

// Format dates (formatDate auto-imported from ~/utils/date, uses Danish locale)
const formattedShortDate = computed(() => formatDate(props.dinnerEvent.date))

// Menu status - uses getDeadlineUrgency from useSeason
const menuStatus = computed(() => {
  const dinnerTimeRange = getDinnerTimeRange(props.dinnerEvent.date, dinnerStartHour, 0)
  const countdown = calculateCountdown(dinnerTimeRange.start, now.value)
  const urgency = getDeadlineUrgency(dinnerTimeRange.start, now.value)

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

// The allergen line: the menu's allergens in their order, each with the kuverter of the diners carrying it
const menuAllergenOverview = computed(() =>
  computeAllergenOverview(props.dinnerEvent.tickets ?? [], props.dinnerEvent.allergens ?? [])
)

const noAllergensMessage = getRandomEmptyMessage('noAllergens', now.value)

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
  menuDescription: event.menuDescription || ''
})

const formState = ref<ChefMenuForm>(toFormState(props.dinnerEvent))

watch(() => props.dinnerEvent, (newEvent) => {
  if (newEvent) formState.value = toFormState(newEvent)
}, { immediate: true })

const isEditingMenu = ref(false)

// The danger zone (cancel dinner) sits behind the actions trigger, away from the routine edit controls
const isMoreOpen = ref(false)

// ========== RELEASE PORTIONS (the queue) ==========

const { ExtraPortionsRequestSchema } = useWaitlistValidation()
const hasQueue = computed(() => (props.waitlist?.entries ?? 0) > 0)
// The waiting list by ticket type, from its lines: "2V 2B"
const queuedFormatted = computed(() => useBilling().formatTicketCounts(
  Object.fromEntries((props.waitlist?.lines ?? []).map(line => [line.ticketType, line.entries.length]))))
// The Flere entry and the CTA open one form; the draft starts on the open, prefilled with the queue's portion need
const isAddingExtraPortions = ref(false)
const extraPortionsDraft = ref<Partial<ExtraPortionsRequest>>({})
const extraPortionsFormRef = useTemplateRef<Form<ExtraPortionsRequest>>('extraPortionsFormRef')

const openExtraPortions = () => {
  extraPortionsDraft.value = { portions: props.waitlist?.portions || undefined }
  isMoreOpen.value = false
  isAddingExtraPortions.value = true
}

const handleExtraPortionsSubmit = (event: FormSubmitEvent<ExtraPortionsRequest>) => {
  emit('extra-portions', event.data.portions)
  isAddingExtraPortions.value = false
}

// Reset transient edit/panel state when navigating to another dinner - never carry a stale
// edit form or an armed danger action across.
watch(() => props.dinnerEvent.id, () => {
  isMoreOpen.value = false
  isEditingMenu.value = false
  isEditingAllergens.value = false
  isAddingExtraPortions.value = false
})

// Can publish: not cancelled or consumed
// - SCHEDULED: creates Heynabo event
// - ANNOUNCED: updates existing Heynabo event (republish)
const canAnnounce = computed(() => {
  return props.dinnerEvent.state !== DinnerState.CANCELLED &&
         props.dinnerEvent.state !== DinnerState.CONSUMED
})

// Can actually submit: menu title must be set
const canAdvanceState = computed(() => {
  if (!canAnnounce.value) return false
  return !!props.dinnerEvent.menuTitle?.trim()
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
  if (!canAdvanceState.value) return
  emit('advance-state', DinnerState.ANNOUNCED)
}

// Cancel dinner handler (DangerButton handles 2-step confirmation)
const handleCancelConfirm = () => {
  isMoreOpen.value = false
  emit('cancel-dinner')
}

// Undo cancel handler (DangerButton with undo=true handles 2-step confirmation)
const handleUndoCancelConfirm = () => {
  emit('undo-cancel-dinner')
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
    :ui="COMPONENTS.chefMenuCard.compactUi(selected)"
    @click="handleCardClick"
  >
    <div :class="COMPONENTS.chefMenuCard.compactRow">
      <!-- Date -->
      <div :class="COMPONENTS.chefMenuCard.compactDate">
        {{ formattedShortDate }}
      </div>

      <!-- Menu title -->
      <div :class="COMPONENTS.chefMenuCard.compactTitleColumn">
        <div :class="hasMenuTitle ? COMPONENTS.chefMenuCard.compactTitle : COMPONENTS.chefMenuCard.compactTitlePlaceholder">
          {{ menuTitle }}
        </div>
      </div>

      <!-- State badge -->
      <UBadge
        :color="stateBadge.color"
        :variant="NOISE.subtle"
        :size="SIZES.small"
        :class="COMPONENTS.chefMenuCard.compactBadge"
      >
        {{ stateBadge.label }}
      </UBadge>

      <!-- Menu status -->
      <UBadge
        :color="menuStatusBadge.color"
        :variant="NOISE.soft"
        :size="SIZES.small"
        :class="COMPONENTS.chefMenuCard.compactBadge"
      >
        {{ menuStatusBadge.label }}
      </UBadge>

      <!-- Budget -->
      <div v-if="formattedBudget" :class="COMPONENTS.chefMenuCard.compactBudget">
        💰 {{ formattedBudget }}
      </div>
    </div>
  </UCard>

  <!-- ========== FULL MODE (VIEW or EDIT) ========== -->
  <UCard
    v-else
    :name="`chef-menu-card-${dinnerEvent.id}`"
    :class="LAYOUTS.cardResponsive"
    :ui="COMPONENTS.chefMenuCard.fullUi"
  >
    <!-- Cancelled ribbon -->
    <div
      v-if="isCancelled"
      :class="getRibbonClasses('cancel')"
      data-testid="cancelled-ribbon"
    >
      {{ BOOKING_WORDS.cancelledDinner.ribbon }}
    </div>

    <template #header>
      <DinnerDetailHeader
        :dinner-event="dinnerEvent"
        :has-prev="hasPrev"
        :has-next="hasNext"
        :calendar-open="calendarOpen"
        :nav-color="navColor"
        @prev="emit('prev')"
        @next="emit('next')"
        @toggle-calendar="emit('toggle-calendar')"
      />
    </template>

    <div :class="COMPONENTS.chefMenuCard.stack">
      <!-- ========== MENU SECTION ========== -->
      <!-- Menu display with action row: edit (primary) - publish (secondary) - more (overflow) -->
      <div v-if="!isEditingMenu">
        <UFormField
          :hint="isEditing ? 'Rediger og publicer aftenens menu' : undefined"
          :ui="COMPONENTS.chefMenuCard.menuFieldUi"
        >
          <template #default>
            <div :class="COMPONENTS.chefMenuCard.menuRow">
              <!-- Menu title -->
              <div :class="hasMenuTitle ? COMPONENTS.chefMenuCard.menuTitle : COMPONENTS.chefMenuCard.menuTitlePlaceholder" data-testid="chef-menu-title">
                {{ menuTitle }}
              </div>

              <!-- Action buttons (EDIT mode only) - full-width stacked on mobile, inline row on desktop -->
              <div v-if="isEditing" :class="LAYOUTS.cardActionRow">
                <!-- Edit menu - primary action (NOISE.loud): labelled, the chef's most frequent task -->
                <UButton
                  v-if="!isCancelled"
                  v-bind="BUTTONS.primaryAction"
                  :class="LAYOUTS.cardActionButton"
                  :color="HERO_BUTTON.primaryButton"
                  :icon="ICONS.edit"
                  :disabled="isUpdating"
                  name="edit-menu"
                  data-testid="edit-menu"
                  @click="isEditingMenu = true"
                >
                  Rediger menu
                </UButton>

                <!-- Publish - secondary action (NOISE.medium): announce or republish to Heynabo -->
                <UButton
                  v-if="canAnnounce"
                  v-bind="BUTTONS.secondaryAction"
                  :class="LAYOUTS.cardActionButton"
                  :color="HERO_BUTTON.primaryButton"
                  :icon="isUpdating ? undefined : ICONS.megaphone"
                  :disabled="!!dinnerEvent.heynaboEventId || !canAdvanceState || isUpdating"
                  :loading="isUpdating"
                  name="announce-dinner"
                  @click="handleAdvanceState"
                >
                  {{ isUpdating ? 'Arbejder...' : (dinnerEvent.heynaboEventId ? 'Publiceret' : 'Publicer') }}
                </UButton>

                <!-- More - the settings wheel + chevron (BUTTONS.settings), reveals the danger zone -->
                <UButton
                  v-if="canCancelDinner(dinnerEvent)"
                  v-bind="{...BUTTONS.settings, ...BUTTONS.flipOpen(isMoreOpen)}"
                  :class="COMPONENTS.chefMenuCard.moreTrigger"
                  :disabled="isUpdating"
                  aria-label="Flere handlinger"
                  data-testid="dinner-more-actions"
                  @click="isMoreOpen = !isMoreOpen"
                />

                <!-- Undo cancel - kept prominent when cancelled: recovering a mistake must be low-friction -->
                <DangerButton
                  v-if="isCancelled"
                  :class="LAYOUTS.cardActionButton"
                  :label="isUpdating ? 'Arbejder...' : 'Annuller aflysning'"
                  :confirm-label="`Tryk igen for at genåbne ${formattedShortDate}...`"
                  :loading="isUpdating"
                  :disabled="isUpdating"
                  :initial-color="HERO_BUTTON.primaryButton"
                  :icon="ICONS.undo"
                  undo
                  @confirm="handleUndoCancelConfirm"
                />
              </div>
            </div>
          </template>
        </UFormField>

        <!-- Overflow panel: the extra-portions entry, then the danger zone for rare + destructive actions, separated from routine controls -->
        <UCollapsible
          v-if="isEditing && canCancelDinner(dinnerEvent)"
          v-model:open="isMoreOpen"
          v-bind="COMPONENTS.collapsible.belowTrigger"
        >
          <template #content>
            <div :class="COMPONENTS.chefMenuCard.morePanel">
              <UButton
                v-bind="BUTTONS.secondaryAction"
                :color="HERO_BUTTON.primaryButton"
                :icon="ICONS.waitlist"
                :disabled="isUpdating"
                data-testid="chef-extra-portions"
                @click="openExtraPortions"
              >
                Frigiv portioner
              </UButton>
              <div :class="COMPONENTS.dangerZone.container" data-testid="dinner-danger-zone">
                <div :class="COMPONENTS.dangerZone.heading">
                  <UIcon :name="ICONS.warning" />
                  Farezone
                </div>
                <p :class="TYPOGRAPHY.bodyTextMuted">
                  <span :class="COMPONENTS.chefMenuCard.dangerLead">Aflys middagen</span> — hele fællesspisningen aflyses for alle beboere.
                  Skal du blot melde fra som chefkok? Brug «Ændre tjans» ved kokkens portræt nedenfor.
                </p>
                <div :class="LAYOUTS.formButtonRow">
                  <UButton
                    v-bind="BUTTONS.cancel"
                    data-testid="dinner-aflys-dismiss"
                    @click="isMoreOpen = false"
                  >
                    Annuller
                  </UButton>
                  <DangerButton
                    :label="isUpdating ? 'Arbejder...' : 'Aflys middagen'"
                    :confirm-label="`Tryk igen for at aflyse ${formattedShortDate}`"
                    :loading="isUpdating"
                    :disabled="isUpdating"
                    @confirm="handleCancelConfirm"
                  />
                </div>
              </div>
            </div>
          </template>
        </UCollapsible>

        <!-- The queue asks the chef for portions while anyone waits; Frigiv portioner opens the same form -->
        <UAlert
          v-if="isEditing && hasQueue && !isAddingExtraPortions && canCancelDinner(dinnerEvent)"
          v-bind="{...ALERTS.info, ...ALERTS.withActions}"
          :icon="ICONS.waitlist"
          :title="`${SUPPLY_WORDS.queuedCount({queuedFormatted})} · ${formatPortions(waitlist!.portions)} portioner`"
          :description="SUPPLY_WORDS.chefAsk(waitlist!.entries)"
          :class="COMPONENTS.chefMenuCard.alertGap"
          data-testid="chef-waitlist-alert"
        >
          <template #actions>
            <UButton
              v-bind="BUTTONS.secondaryAction"
              :color="COLOR.info"
              :icon="ICONS.waitlist"
              :disabled="isUpdating"
              data-testid="chef-extra-portions-cta"
              @click="openExtraPortions"
            >
              Frigiv portioner
            </UButton>
          </template>
        </UAlert>

        <!-- Extra portions: one number, prefilled with the waiting list's portion need -->
        <UForm
          v-if="isEditing && isAddingExtraPortions"
          ref="extraPortionsFormRef"
          :schema="ExtraPortionsRequestSchema"
          :state="extraPortionsDraft"
          :class="[COMPONENTS.chefMenuCard.form, COMPONENTS.chefMenuCard.alertGap]"
          data-testid="chef-extra-portions-form"
          @submit="handleExtraPortionsSubmit"
        >
          <UFormField label="Kan du frigive portioner?" name="portions" hint="Portioner, f.eks. 2,5" :class="COMPONENTS.chefMenuCard.field">
            <UInput v-model.number="extraPortionsDraft.portions" type="number" :step="0.5" :min="0" :size="SIZES.standard" name="chef-extra-portions-input" :class="COMPONENTS.chefMenuCard.field" />
          </UFormField>
          <div :class="LAYOUTS.formButtonRow">
            <UButton v-bind="BUTTONS.cancel" data-testid="chef-extra-portions-cancel" @click="isAddingExtraPortions = false">Fortryd</UButton>
            <UButton v-bind="BUTTONS.save" :color="HERO_BUTTON.primaryButton" :loading="isUpdating" data-testid="chef-extra-portions-submit" @click="extraPortionsFormRef?.submit()">Frigiv</UButton>
          </div>
        </UForm>

        <div v-if="dinnerEvent.menuDescription" :class="COMPONENTS.chefMenuCard.description" data-testid="chef-menu-description">
          {{ dinnerEvent.menuDescription }}
        </div>

        <!-- Chef portrait + RoleAssignment trigger -->
        <div :class="COMPONENTS.chefMenuCard.chefRow">
          <div
            :class="dinnerEvent.chef ? COMPONENTS.wantedPoster.trigger : [COMPONENTS.wantedPoster.trigger, COMPONENTS.wantedPoster.frame]"
            :data-testid="dinnerEvent.chef ? 'chef-display' : 'chef-wanted'"
            @click="roleAssignmentRef?.open()"
          >
            <!-- Portrait frame around avatar -->
            <div :class="COMPONENTS.wantedPoster.portrait">
              <div :class="COMPONENTS.wantedPoster.ring">
                <UserListItem
                  v-if="dinnerEvent.chef"
                  :inhabitants="dinnerEvent.chef"
                  :show-names="false"
                  :link-to-profile="false"
                  :size="SIZES.standard"
                />
                <UAvatar v-else v-bind="COMPONENTS.wantedPoster.avatar" :icon="ICONS.help" :size="SIZES.standard" />
              </div>
              <!-- Chef hat on top -->
              <UIcon :name="ICONS.chef" :class="[COMPONENTS.wantedPoster.hat, dinnerEvent.chef ? COMPONENTS.wantedPoster.hatOnPage : COMPONENTS.wantedPoster.hatOnFrame]" />
            </div>
            <!-- Name or WANTED -->
            <div :class="COMPONENTS.wantedPoster.nameStack">
              <span v-if="dinnerEvent.chef" :class="TYPOGRAPHY.cardTitle">{{ formatNameWithInitials(dinnerEvent.chef) }}</span>
              <span v-else :class="COMPONENTS.wantedPoster.lettering">WANTED</span>
              <span :class="dinnerEvent.chef ? TYPOGRAPHY.bodyTextMuted : COMPONENTS.wantedPoster.role">Chefkok</span>
            </div>
          </div>

          <RoleAssignment
            ref="roleAssignmentRef"
            :dinner-event="dinnerEvent"
            :role="TeamRole.CHEF"
            @role-assigned="emit('role-assigned')"
            @role-removed="emit('role-removed')"
          />
        </div>

        <!-- Warning when menu title missing -->
        <UAlert
          v-if="isEditing && canAnnounce && !canAdvanceState"
          v-bind="ALERTS.warning"
          :icon="ICONS.info"
          :class="COMPONENTS.chefMenuCard.alertGap"
        >
          <template #description>Chefkokken skal oprette en menu, før den kan publiceres</template>
        </UAlert>
      </div>

      <!-- EDIT mode: Edit menu fields with Zod validation -->
      <UForm
        v-if="isEditing && isEditingMenu"
        :schema="ChefMenuFormSchema"
        :state="formState"
        :class="COMPONENTS.chefMenuCard.form"
        @submit="handleFormSubmit"
      >
        <UFormField label="Menu titel" name="menuTitle" required :class="COMPONENTS.chefMenuCard.field" hint="Hvad er aftenens ret?">
          <UInput v-model="formState.menuTitle" placeholder="Aftenens ret, f.eks. Spaghetti Carbonara" :size="SIZES.standard" name="chef-menu-title-input" :class="COMPONENTS.chefMenuCard.field" />
        </UFormField>
        <UFormField label="Beskrivelse" name="menuDescription" :class="COMPONENTS.chefMenuCard.field" hint="Beskriv menuen kort">
          <UTextarea v-model="formState.menuDescription" placeholder="Kort beskrivelse af retten og evt. tilbehør" :rows="3" :size="SIZES.standard" name="chef-menu-description-input" :class="COMPONENTS.chefMenuCard.field" />
        </UFormField>
        <div :class="LAYOUTS.formButtonRow">
          <UButton v-bind="BUTTONS.cancel" data-testid="cancel-menu-edit" @click="handleMenuCancel">Annuller</UButton>
          <UButton v-bind="BUTTONS.save" :color="HERO_BUTTON.primaryButton" type="submit" data-testid="save-menu-edit">Gem</UButton>
        </div>
      </UForm>

      <!-- ========== ALLERGEN SECTION ========== -->
      <div v-if="showAllergens && allergyTypes.length > 0" :class="COMPONENTS.chefMenuCard.section">
        <!-- The allergen line: the menu's allergens on this dinner's diners, Rediger allergener in EDIT mode -->
        <div v-if="!isEditingAllergens" data-testid="chef-allergen-line" :class="COMPONENTS.cardSection.row">
          <span data-testid="chef-allergen-label" :class="COMPONENTS.cardSection.label">
            <UIcon :name="ICONS.allergy" :class="COMPONENTS.cardSection.glyph" />
            Allergener
          </span>
          <div :class="COMPONENTS.cardSection.line">
            <AllergyOverviewLine
              v-if="menuAllergenOverview.breakdownByAllergen.length > 0"
              data-testid="chef-allergen-overview"
              :total-portions="menuAllergenOverview.totalPortions"
              :allergens="menuAllergenOverview.breakdownByAllergen"
              :with-glyph="false"
            />
            <span v-else :class="TEXT.muted">{{ noAllergensMessage.emoji }} {{ noAllergensMessage.text }}</span>
          </div>
          <UButton
            v-if="isEditing"
            v-bind="BUTTONS.secondaryAction"
            :class="LAYOUTS.cardActionButton"
            :color="HERO_BUTTON.primaryButton"
            :icon="ICONS.edit"
            :disabled="isUpdating"
            name="edit-allergens"
            data-testid="edit-allergens"
            @click="isEditingAllergens = true"
          >
            Rediger allergener
          </UButton>
        </div>

        <!-- EDIT allergens: title + form-footer buttons (DS configs, mobile-stacked), then selector -->
        <div v-else :class="COMPONENTS.cardSection.editor">
          <div :class="COMPONENTS.cardSection.editorHead">
            <h4 :class="COMPONENTS.cardSection.editorTitle">Allergener i menuen</h4>
            <div :class="LAYOUTS.formButtonRow">
              <UButton v-bind="BUTTONS.cancel" data-testid="cancel-allergens-edit" @click="handleAllergenCancel">Annuller</UButton>
              <UButton v-bind="BUTTONS.save" :color="HERO_BUTTON.primaryButton" data-testid="save-allergens-edit" @click="handleAllergenSave">Gem</UButton>
            </div>
          </div>
          <AllergenMultiSelector
            v-model="draftAllergenIds"
            :allergy-types="allergyTypes"
            :tickets="dinnerEvent.tickets ?? []"
          />
        </div>
      </div>

      <!-- ========== MADBESTILLING (showStateControls only): the chef's grocery lines as a section row, beside the other edits ========== -->
      <div v-if="showStateControls" :class="COMPONENTS.chefMenuCard.section" data-testid="chef-expenses-section">
        <ExpenseLines
          :expenses="dinnerEvent.expenses"
          title="Madbestilling"
          hint="Hvad kostede indkøbene?"
          empty-text="Madbestilling mangler"
          edit-label="Rediger madbestilling"
          :glyph="ICONS.shoppingCart"
          :color="HERO_BUTTON.primaryButton"
          :editable="isEditing"
          :pending="isUpdating"
          :budget-gross="budget.availableBudget"
          :round="round"
          :note-prefill="expenseNote"
          @add="emit('add-expense', $event)"
          @remove="emit('remove-expense', $event)"
        />
      </div>

      <!-- ========== PAGE-SPECIFIC CONTENT (slot) ========== -->
      <div v-if="$slots.default" :class="COMPONENTS.chefMenuCard.section">
        <slot />
      </div>

      <!-- ========== STATE CONTROLS (showStateControls only) ========== -->
      <template v-if="showStateControls">
        <!-- Status stepper (includes deadline badges) -->
        <div :class="COMPONENTS.chefMenuCard.section">
          <DinnerStatusStepper
            :dinner-event="dinnerEvent"
            :deadlines="deadlines"
            :mode="isEditing ? 'full' : 'compact'"
            :show-deadlines="isEditing"
          />
        </div>

        <!-- Budget section (chef's financial overview): boxes, ticket table, ticket changes, the team's round -->
        <div :class="COMPONENTS.chefMenuCard.section">
          <DinnerBudget
            :orders="dinnerEvent.tickets ?? []"
            :expenses="dinnerEvent.expenses"
            :dinner-event-id="dinnerEvent.id"
            :booking-deadline="bookingDeadline"
            :dinner-fragment="dinnerFragment"
            :team-fragment="teamFragment"
            mode="full"
          />
        </div>
      </template>
    </div>
  </UCard>
</template>
