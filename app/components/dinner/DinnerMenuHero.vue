<script setup lang="ts">
/**
 * DinnerMenuHero - Hero panel for dinner display and editing
 *
 * Supports two modes:
 * - 'household': Mobile-first booking interface (90% mobile usage) + readonly allergen view
 * - 'chef': Menu editing interface with allergen selection (no booking section)
 *
 * Household mode: Single-click edit for bookings, [ÆNDRE BOOKING] button enters EDIT mode
 * Chef mode: Inline editing for menu title, description, allergens
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * EMPTY STATE (no dinner event):
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ UPageHero (mocha gradient background)                              │
 * │                                                                     │
 * │                           🍽️                                        │
 * │                                                                     │
 * │              Ingen fællesspisning denne dag                         │
 * │                                                                     │
 * │        Vælg en anden dato i kalenderen for at                       │
 * │              se menuoplysninger                                     │
 * │                                                                     │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * VIEW MODE - Show who's booked (no prices):
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ UPageHero - 🍽️ Pasta Carbonara                                     │
 * │ ┌─────────────────────────────────────────────────────────────────┐ │
 * │ │   ┌───────────────────────────────────────────────────────┐    │ │
 * │ │   │ BOOKING SECTION                                       │    │ │
 * │ │   │                                                       │    │ │
 * │ │   │ [Voksen]  👤 Anna      🍽️                           │    │ │
 * │ │   │ [Voksen]  👤 Bob       🍽️                           │    │ │
 * │ │   │ [Barn]    👤 Clara     🍽️                           │    │ │
 * │ │   │ [Baby]    👤 David     ❌                            │    │ │
 * │ │   │                                                       │    │ │
 * │ │   │              [ÆNDRE BOOKING]                          │    │ │
 * │ │   │                                                       │    │ │
 * │ │   └───────────────────────────────────────────────────────┘    │ │
 * │ └─────────────────────────────────────────────────────────────────┘ │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * EDIT MODE - DESKTOP (horizontal DinnerModeSelector):
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ UPageHero                                                           │
 * │ ┌─────────────────────────────────────────────────────────────────┐ │
 * │ │   ┌───────────────────────────────────────────────────────┐    │ │
 * │ │   │ [⚡ Power mode: Opdater hele familien]               │    │ │
 * │ │   │ ───────────────────────────────────────────────────── │    │ │
 * │ │   │                                                       │    │ │
 * │ │   │ [Voksen] 👤 Anna  [🍽️][🕐][🛍️][❌]       60 kr    │    │ │
 * │ │   │                    ^^^^                               │    │ │
 * │ │   │ [Voksen] 👤 Bob   [🍽️][🕐][🛍️][❌]       60 kr    │    │ │
 * │ │   │                    ^^^^                               │    │ │
 * │ │   │ [Barn] 👤 Clara   [🍽️][🕐][🛍️][❌]       30 kr    │    │ │
 * │ │   │                    ^^^^                               │    │ │
 * │ │   │ [Baby] 👤 David   [🍽️][🕐][🛍️][❌]        0 kr    │    │ │
 * │ │   │                           ^^^^                        │    │ │
 * │ │   │ ───────────────────────────────────────────────────── │    │ │
 * │ │   │ [+] Tilføj gæst                                       │    │ │
 * │ │   │ ───────────────────────────────────────────────────── │    │ │
 * │ │   │                                  Total: 150 kr        │    │ │
 * │ │   │                                                       │    │ │
 * │ │   │              [Annuller] [💾 Gem]                      │    │ │
 * │ │   └───────────────────────────────────────────────────────┘    │ │
 * │ └─────────────────────────────────────────────────────────────────┘ │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * EDIT MODE - MOBILE (vertical DinnerModeSelector):
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ┌───────────────────────────────────┐
 * │ UPageHero                         │
 * │ ┌───────────────────────────────┐ │
 * │ │ ┌───────────────────────────┐ │ │
 * │ │ │ [⚡ Power mode]          │ │ │
 * │ │ ├───────────────────────────┤ │ │
 * │ │ │                           │ │ │
 * │ │ │ [Voksen] 👤 Anna         │ │ │
 * │ │ │ [🍽️ Spis]               │ │ │
 * │ │ │ [🕐 Sen]                 │ │ │
 * │ │ │ [🛍️ Takeaway]           │ │ │
 * │ │ │ [❌ Ingen]               │ │ │
 * │ │ │                  60 kr    │ │ │
 * │ │ │                           │ │ │
 * │ │ │ [Voksen] 👤 Bob          │ │ │
 * │ │ │ [🍽️ Spis]               │ │ │
 * │ │ │ [🕐 Sen]                 │ │ │
 * │ │ │ [🛍️ Takeaway]           │ │ │
 * │ │ │ [❌ Ingen]               │ │ │
 * │ │ │                  60 kr    │ │ │
 * │ │ ├───────────────────────────┤ │ │
 * │ │ │ [+] Tilføj gæst          │ │ │
 * │ │ ├───────────────────────────┤ │ │
 * │ │ │         Total: 150 kr     │ │ │
 * │ │ │                           │ │ │
 * │ │ │ [Annuller] [💾 Gem]      │ │ │
 * │ │ └───────────────────────────┘ │ │
 * │ └───────────────────────────────┘ │
 * └───────────────────────────────────┘
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * CHEF MODE - Menu editing with allergen selection:
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ UPageHero - 🍽️ Pasta Carbonara                                     │
 * │ ┌─────────────────────────────────────────────────────────────────┐ │
 * │ │   ┌───────────────────────────────────────────────────────┐    │ │
 * │ │   │ ALLERGEN SECTION (VIEW MODE)                          │    │ │
 * │ │   │                                                       │    │ │
 * │ │   │ 🥛 Mælk   🌾 Gluten                                  │    │ │
 * │ │   │ 👤 👤 👤   3 beboere berørt                          │    │ │
 * │ │   │                                                       │    │ │
 * │ │   │              [REDIGER ALLERGENER]                     │    │ │
 * │ │   │                                                       │    │ │
 * │ │   └───────────────────────────────────────────────────────┘    │ │
 * │ └─────────────────────────────────────────────────────────────────┘ │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ ALLERGEN SECTION (EDIT MODE - follows AllergenMultiSelector)      │
 * │ ┌─────────────────────────────────────────────────────────────────┐ │
 * │ │ MASTER                        │  DETAIL                         │ │
 * │ │ ┌──────────────────────────┐  │ ┌───────────────────────────┐  │ │
 * │ │ │ ☑ Icon  Name     Count   │  │ │ 📊 Statistik              │  │ │
 * │ │ ├──────────────────────────┤  │ │                           │  │ │
 * │ │ │ ☑ 🥛  Mælk       2       │  │ │ Unikke beboere berørt: 3  │  │ │
 * │ │ │ ☐ 🥜  Jordnødder 2       │  │ │ 👤 Anna, Bob, Clara       │  │ │
 * │ │ │ ☑ 🌾  Gluten     1       │  │ │                           │  │ │
 * │ │ └──────────────────────────┘  │ │ Fordeling pr. allergen:   │  │ │
 * │ │                               │ │ 🥛 Mælk: 2                │  │ │
 * │ │                               │ │ 🌾 Gluten: 1              │  │ │
 * │ │                               │ └───────────────────────────┘  │ │
 * │ └─────────────────────────────────────────────────────────────────┘ │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Features:
 * - UPageHero for responsive hero structure
 * - Empty state when no dinner event
 * - Household mode: Booking interface + readonly allergen view
 * - Chef mode: Allergen editing (view/edit modes) + NO booking section
 * - AllergenMultiSelector integration with master-detail pattern
 * - VIEW mode: Show all household members with their bookings (household mode only)
 * - Prominent [ÆNDRE BOOKING] button (single click to edit, household mode only)
 * - EDIT mode: Inline DinnerModeSelector (responsive: horizontal desktop, vertical mobile, household mode only)
 * - Power mode for family-wide booking updates (household mode only)
 * - Total price calculation (household mode only)
 * - Menu title/description inline editing with pencil icon (chef mode) ✅
 * - TODO: Add guest functionality (household mode)
 * - TODO: Ticket price selection dropdown (when multiple prices per type, household mode)
 * - TODO: Picture upload modal (chef mode)
 */
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import {FORM_MODES} from '~/types/form'

interface Props {
  dinnerEvent?: any // DinnerEventDetail with tickets (parsed by schema in parent)
  ticketPrices?: TicketPrice[]
  mode?: 'household' | 'chef' | 'view'
}

const props = withDefaults(defineProps<Props>(), {
  dinnerEvent: undefined,
  ticketPrices: () => [],
  mode: 'household'
})

// Emit events for booking actions (parent handles business logic)
const emit = defineEmits<{
  updateBooking: [inhabitantId: number, dinnerMode: string, ticketPriceId: number]
  updateAllBookings: [dinnerMode: string]
  addGuest: []
  updateAllergens: [allergenIds: number[]]
  updateMenu: [data: { dinnerEventId: number, menuTitle: string, menuDescription: string }]
}>()

// Use allergies store for allergen data
const allergiesStore = useAllergiesStore()
const {allergyTypes} = storeToRefs(allergiesStore)

// Use plan store for role assignment
const planStore = usePlanStore()

// Use bookings store for dinner event updates (allergens)
const bookingsStore = useBookingsStore()
const {isUpdatingAllergens} = storeToRefs(bookingsStore)

// Use auth store to get current user's inhabitant
const authStore = useAuthStore()
const {user} = storeToRefs(authStore)
const currentInhabitant = computed(() => user.value?.Inhabitant)

// Use season composable for permission checks
const {isChefFor} = useSeason()

// Use dinner event from props (component-local data pattern - ADR-007)
const selectedDinnerEvent = computed(() => props.dinnerEvent)

// Data from dinner event
const orders = computed(() => selectedDinnerEvent.value?.tickets ?? [])

// Extract selected allergen IDs from dinner event
const selectedAllergenIds = computed(() => {
  if (!selectedDinnerEvent.value?.allergens) return []
  return selectedDinnerEvent.value.allergens.map((a: any) => a.allergyTypeId)
})

// Draft allergen selection for chef editing
const draftAllergenIds = ref<number[]>([])
watch(selectedAllergenIds, (newIds) => {
  draftAllergenIds.value = [...newIds]
}, {immediate: true})

// Draft state for menu editing (chef mode)
const draftMenuTitle = ref('')
const draftMenuDescription = ref('')
const isEditingMenu = ref(false)

// Initialize draft menu fields when dinner event changes
watch(selectedDinnerEvent, (newEvent) => {
  if (newEvent) {
    draftMenuTitle.value = newEvent.menuTitle || ''
    draftMenuDescription.value = newEvent.menuDescription || ''
  }
}, {immediate: true})

// Design system
const { BACKGROUNDS, TYPOGRAPHY, SIZES, COMPONENTS, ICONS } = useTheSlopeDesignSystem()

// UI state for booking section
const formMode = ref(FORM_MODES.VIEW)
const isPowerModeActive = ref(false)

// Handle menu save (emit to parent for API update)
const handleMenuSave = () => {
  if (!selectedDinnerEvent.value?.id) return
  emit('updateMenu', {
    dinnerEventId: selectedDinnerEvent.value.id,
    menuTitle: draftMenuTitle.value,
    menuDescription: draftMenuDescription.value
  })
  isEditingMenu.value = false
}

// Handle menu cancel
const handleMenuCancel = () => {
  draftMenuTitle.value = selectedDinnerEvent.value?.menuTitle || ''
  draftMenuDescription.value = selectedDinnerEvent.value?.menuDescription || ''
  isEditingMenu.value = false
}

// Draft state for editing
const {DinnerModeSchema} = useBookingValidation()
const DinnerMode = DinnerModeSchema.enum
const draftDinnerMode = ref<typeof DinnerMode[keyof typeof DinnerMode]>(DinnerMode.DINEIN)

// Role assignment (for volunteering buttons)
const {TeamRoleSchema} = useCookingTeamValidation()
const TeamRole = TeamRoleSchema.enum

// Check if user can volunteer for cooking roles
const canVolunteer = computed(() => {
  if (!currentInhabitant.value) return false
  if (!selectedDinnerEvent.value?.cookingTeamId) return false
  // TODO: Check if already assigned to this team
  return true
})

// Check if current user is a chef for this dinner's team (edit guard for all menu editing)
const canEditMenu = computed(() => {
  if (props.mode !== 'chef') return false
  if (!currentInhabitant.value?.id) return false
  if (!selectedDinnerEvent.value?.cookingTeam) return false
  return isChefFor(currentInhabitant.value.id, selectedDinnerEvent.value.cookingTeam)
})

// Handle role assignment (volunteer as chef/cook/helper)
const isAssigningRole = ref(false)
const handleRoleAssignment = async (role: typeof TeamRole[keyof typeof TeamRole]) => {
  if (!selectedDinnerEvent.value?.id || !currentInhabitant.value?.id) return

  isAssigningRole.value = true
  try {
    await planStore.assignRoleToDinner(
      selectedDinnerEvent.value.id,
      currentInhabitant.value.id,
      role
    )
    // Success feedback could be added here
  } catch (error) {
    console.error('Failed to assign role:', error)
    // Error feedback could be added here
  } finally {
    isAssigningRole.value = false
  }
}

// Calculate total price
const totalPrice = computed(() => {
  if (!orders.value || !selectedDinnerEvent.value) return 0
  return orders.value
    .filter((o: any) => o.dinnerEventId === selectedDinnerEvent.value!.id)
    .reduce((sum: number, order: any) => sum + order.priceAtBooking, 0)
})

// Count booked inhabitants
const bookedCount = computed(() => {
  if (!orders.value || !selectedDinnerEvent.value) return 0
  return orders.value.filter((o: any) => o.dinnerEventId === selectedDinnerEvent.value!.id).length
})

// Handle allergen selection updates (chef mode)
const handleAllergenUpdate = (allergenIds: number[]) => {
  draftAllergenIds.value = allergenIds
  emit('updateAllergens', allergenIds)
}

// Determine allergen selector mode
const allergenSelectorMode = computed(() => {
  if (props.mode === 'household') return 'view'
  // Chef mode: edit when in EDIT formMode
  return formMode.value === FORM_MODES.EDIT ? 'edit' : 'view'
})

// Formatted date (formatDate auto-imported from ~/utils/date)
const formattedDinnerDate = computed(() => {
  if (!selectedDinnerEvent.value?.date) return ''
  return formatDate(selectedDinnerEvent.value.date)
})
</script>

<template>
  <!-- Empty state when no dinner event -->
  <UPageHero
    v-if="!selectedDinnerEvent"
    :class="BACKGROUNDS.hero.mocha"
    class="min-h-[300px] md:min-h-[400px]"
  >
    <template #headline>
      <div class="text-6xl md:text-8xl">🍽️</div>
    </template>
    <template #title>
      Ingen fællesspisning denne dag
    </template>
    <template #description>
      Vælg en anden dato i kalenderen for at se menuoplysninger
    </template>
  </UPageHero>

  <!-- Dinner event content -->
  <UPageHero
    v-else
    :class="selectedDinnerEvent.menuPictureUrl ? '' : BACKGROUNDS.hero.mocha"
    :style="selectedDinnerEvent.menuPictureUrl
      ? `background-image: url(${selectedDinnerEvent.menuPictureUrl}); background-size: cover; background-position: center;`
      : ''"
    class="min-h-[300px] md:min-h-[400px]"
    data-testid="dinner-menu-hero"
  >
    <template #top>
      <!-- Overlay for better text readability when image is present -->
      <div
        v-if="selectedDinnerEvent.menuPictureUrl"
        class="absolute inset-0 bg-black/40 -z-10"
      />
    </template>

    <template #title>
      <!-- Date - discrete with design system -->
      <div :class="`${TYPOGRAPHY.caption} text-white/70 mb-2 flex items-center gap-1.5 justify-center`">
        <UIcon :name="ICONS.calendar" class="w-3.5 h-3.5" />
        <span>{{ formattedDinnerDate }}</span>
      </div>

      <!-- Menu title - VIEW mode (chef can edit, others read-only) -->
      <div v-if="!isEditingMenu" class="flex items-center justify-center gap-2">
        <span class="text-white" data-testid="dinner-menu-title">{{ selectedDinnerEvent.menuTitle }}</span>
        <UButton
          v-if="mode === 'chef' && canEditMenu"
          :icon="ICONS.edit"
          color="white"
          variant="ghost"
          size="xs"
          name="edit-menu-title"
          @click="isEditingMenu = true"
        />
      </div>

      <!-- Menu title - EDIT mode (chef only) -->
      <UFormField v-else>
        <UInput
          v-model="draftMenuTitle"
          placeholder="Menu titel"
          size="xl"
          color="white"
          variant="outline"
          data-testid="dinner-menu-title-input"
        />
      </UFormField>
    </template>

    <template #description>
      <!-- Menu description - VIEW mode -->
      <div v-if="!isEditingMenu">
        <span v-if="selectedDinnerEvent.menuDescription" class="text-white opacity-90" data-testid="dinner-menu-description">
          {{ selectedDinnerEvent.menuDescription }}
        </span>
      </div>

      <!-- Menu description - EDIT mode (chef only) -->
      <div v-else>
        <UFormField>
          <UInput
            v-model="draftMenuDescription"
            placeholder="Menu beskrivelse (valgfri)"
            size="lg"
            color="white"
            variant="outline"
            data-testid="dinner-menu-description-input"
          />
        </UFormField>

        <!-- Save/Cancel buttons for menu editing -->
        <div class="flex gap-2 justify-center mt-4">
          <UButton
            color="white"
            variant="ghost"
            :size="SIZES.standard.value"
            name="cancel-menu-edit"
            @click="handleMenuCancel"
          >
            Annuller
          </UButton>
          <UButton
            color="white"
            variant="solid"
            :size="SIZES.standard.value"
            icon="i-heroicons-check"
            name="save-menu-edit"
            @click="handleMenuSave"
          >
            Gem
          </UButton>
        </div>
      </div>
    </template>

    <template #body>
      <div class="space-y-6">
        <!-- Allergen Selector -->
        <div v-if="allergyTypes.length > 0">
          <UFieldGroup v-if="mode === 'chef'" :class="COMPONENTS.heroPanel.light.container">
            <template #header>
              <span :class="TYPOGRAPHY.cardTitle">Allergener i menuen</span>
            </template>

            <AllergenMultiSelector
              v-model="draftAllergenIds"
              :allergy-types="allergyTypes"
              :mode="allergenSelectorMode"
              :show-statistics="allergenSelectorMode === 'edit'"
              :readonly="formMode === FORM_MODES.VIEW"
              @update:model-value="handleAllergenUpdate"
            />

            <template #footer>
              <!-- VIEW mode: Edit button -->
              <UFormField v-if="formMode === FORM_MODES.VIEW">
                <div class="flex justify-center">
                  <UButton
                    :color="COMPONENTS.heroPanel.light.primaryButton"
                    variant="outline"
                    :size="SIZES.standard.value"
                    icon="i-heroicons-pencil"
                    name="edit-allergens"
                    :disabled="!canEditMenu"
                    @click="formMode = FORM_MODES.EDIT"
                  >
                    Rediger allergener
                  </UButton>
                </div>
              </UFormField>

              <!-- EDIT mode: Save/Cancel buttons -->
              <UFormField v-else-if="formMode === FORM_MODES.EDIT">
                <div class="flex gap-2 justify-end">
                  <UButton
                    :color="COMPONENTS.heroPanel.light.secondaryButton"
                    variant="ghost"
                    :size="SIZES.standard.value"
                    name="cancel-allergens"
                    :disabled="isUpdatingAllergens"
                    @click="() => { draftAllergenIds = [...selectedAllergenIds]; formMode = FORM_MODES.VIEW }"
                  >
                    Annuller
                  </UButton>
                  <UButton
                    :color="COMPONENTS.heroPanel.light.primaryButton"
                    variant="solid"
                    :size="SIZES.standard.value"
                    icon="i-heroicons-check"
                    name="save-allergens"
                    :loading="isUpdatingAllergens"
                    :disabled="isUpdatingAllergens"
                    @click="() => { handleAllergenUpdate(draftAllergenIds); formMode = FORM_MODES.VIEW }"
                  >
                    Gem
                  </UButton>
                </div>
              </UFormField>
            </template>
          </UFieldGroup>
          <AllergenMultiSelector
            v-else
            :model-value="selectedAllergenIds"
            :allergy-types="allergyTypes"
            mode="view"
            readonly
          />
        </div>

        <!-- Volunteer Buttons (always visible in all modes) -->
        <UFieldGroup
          label="🍽️ Vil du hjælpe til med madlavningen?"
          :class="COMPONENTS.heroPanel.light.container"
        >
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
            <UButton
              :color="COMPONENTS.heroPanel.light.primaryButton"
              variant="solid"
              size="md"
              name="volunteer-chef"
              icon="i-heroicons-plus"
              :loading="isAssigningRole"
              :disabled="isAssigningRole || !canVolunteer"
              block
              @click="handleRoleAssignment(TeamRole.CHEF)"
            >
              Bliv chefkok 👨‍🍳
            </UButton>
            <UButton
              :color="COMPONENTS.heroPanel.light.primaryButton"
              variant="solid"
              size="md"
              name="volunteer-cook"
              icon="i-heroicons-plus"
              :loading="isAssigningRole"
              :disabled="isAssigningRole || !canVolunteer"
              block
              @click="handleRoleAssignment(TeamRole.COOK)"
            >
              Bliv kok 👥
            </UButton>
            <UButton
              :color="COMPONENTS.heroPanel.light.primaryButton"
              variant="solid"
              size="md"
              name="volunteer-helper"
              icon="i-heroicons-plus"
              :loading="isAssigningRole"
              :disabled="isAssigningRole || !canVolunteer"
              block
              @click="handleRoleAssignment(TeamRole.JUNIORHELPER)"
            >
              Bliv kokkespire 🌱
            </UButton>
          </div>
        </UFieldGroup>

        <!-- Booking Section (household mode only) -->
        <div v-if="mode === 'household'" :class="`${COMPONENTS.heroPanel.subtle.container} text-white`">
          <!-- Booking Form (handles household data fetching internally) -->
          <DinnerBookingForm
            :dinner-event="selectedDinnerEvent"
            :orders="orders"
            :ticket-prices="ticketPrices"
            :form-mode="formMode"
            @update-booking="emit('updateBooking', $event)"
            @update-all-bookings="emit('updateAllBookings', $event)"
          />

          <!-- VIEW mode: Prominent edit button -->
          <UButton
            v-if="formMode === FORM_MODES.VIEW"
            color="primary"
            variant="solid"
            size="lg"
            name="edit-booking"
            block
            class="mt-4"
            @click="formMode = FORM_MODES.EDIT"
          >
            ÆNDRE BOOKING
          </UButton>

          <!-- EDIT mode: Total price + Action buttons -->
          <div v-else-if="formMode === FORM_MODES.EDIT" class="mt-4 space-y-4">
            <!-- Total Price Footer -->
            <div class="border-t border-white/20 pt-4">
              <div class="flex justify-between items-center text-lg font-semibold">
                <span>Total:</span>
                <span>{{ totalPrice }} kr</span>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-2">
              <UButton
                color="neutral"
                variant="ghost"
                size="lg"
                name="cancel-booking"
                @click="formMode = FORM_MODES.VIEW; isPowerModeActive = false"
              >
                Annuller
              </UButton>
              <UButton
                color="primary"
                variant="solid"
                size="lg"
                name="save-booking"
                class="flex-1"
                icon="i-heroicons-save"
                @click="formMode = FORM_MODES.VIEW"
              >
                Gem
              </UButton>
            </div>
          </div> <!-- Close EDIT mode div -->
        </div> <!-- Close booking section div -->
      </div> <!-- Close space-y-6 div -->
    </template> <!-- Close #body slot -->
  </UPageHero>
</template>
