<script setup lang="ts">
/**
 * HouseholdCard - members and their settings - especially weekly dinner preferences
 *
 * Expandable table pattern with power mode:
 * - Power row (first row): Updates all family members at once with ⚡ icon
 * - Collapsed row: Shows ticket type, name, preferences as VIEW badges with ✏️ icon
 * - Expanded row: WeekDayMapDinnerModeDisplay in EDIT mode (button groups)
 * - Only one row can be expanded at a time
 * - Changes save immediately
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ UCARD                                                                   │
 * │ ┌─────────────────────────────────────────────────────────────────────┐ │
 * │ │ HEADER: Husstandens ugentlige booking præferencer                   │ │
 * │ └─────────────────────────────────────────────────────────────────────┘ │
 * │ ┌─────────────────────────────────────────────────────────────────────┐ │
 * │ │ BODY                                                                │ │
 * │ │                                                                     │ │
 * │ │ UTable - Inhabitants with expandable rows                          │ │
 * │ │ ┌───────────────────────────────────────────────────────────────┐  │ │
 * │ │ │ [⚡] Powermode! 👥👥👥 Alle medlemmer  🍽️ 🍽️ 🍽️ 🍽️ 🛍️   │  │ │  ← Power mode
 * │ │ ├───────────────────────────────────────────────────────────────┤  │ │
 * │ │ │ [✏️] Voksen  👤 Anna      🍽️ 🍽️ 🍽️ 🍽️ 🛍️   ← collapsed      │  │ │
 * │ │ ├───────────────────────────────────────────────────────────────┤  │ │
 * │ │ │ [✏️] Voksen  👤 Bob      🍽️ 🍽️ ❌ 🍽️ 🛍️   ← collapsed      │  │ │
 * │ │ ├───────────────────────────────────────────────────────────────┤  │ │
 * │ │ │ [✏️] Barn    👤 Clara    🍽️ 🍽️ 🍽️ 🍽️ 🛍️   ← collapsed      │  │ │
 * │ │ ├───────────────────────────────────────────────────────────────┤  │ │
 * │ │ │ [✏️] Baby    👤 David    ❌ ❌ ❌ ❌ ❌       ← collapsed      │  │ │
 * │ │ └───────────────────────────────────────────────────────────────┘  │ │
 * │ └─────────────────────────────────────────────────────────────────────┘ │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * EXPANDED (regular member):
 * ┌───────────────────────────────────────────────────────────────┐
 * │ [▼] Voksen  👤 Anna                                          │
 * │ ──────────────────────────────────────────────────────────── │
 * │  EXPANDED:                                                   │
 * │  Mon: [🍽️ Spis][🕐 Sen][🛍️ Take][❌ Ingen]   ← button groups │
 * │  Tue: [🍽️ Spis][🕐 Sen][🛍️ Take][❌ Ingen]                 │
 * │  Wed: [🍽️ Spis][🕐 Sen][🛍️ Take][❌ Ingen]                 │
 * │  Thu: [🍽️ Spis][🕐 Sen][🛍️ Take][❌ Ingen]                 │
 * │  Fri: [🍽️ Spis][🕐 Sen][🛍️ Take][❌ Ingen]                 │
 * │  (Active: solid success/warning/primary, Inactive: ghost)    │
 * │  (NONE: active=ghost error, inactive=ghost neutral)          │
 * └───────────────────────────────────────────────────────────────┘
 *
 * Legend:
 * - ⚡ = Power mode (update all members)
 * - ✏️ = Pencil icon (edit single member)
 * - ▼ = Chevron down (expanded row - click to collapse)
 * - 🍽️🕐🛍️❌ = Compact badges (collapsed VIEW mode)
 * - [Button] = Button groups (expanded EDIT mode)
 */
import {FORM_MODES} from '~/types/form'
import type {HouseholdDetail} from '~/composables/useCoreValidation'
import {WEEKDAYS, type WeekDayMap} from '~/types/dateTypes'
import type {DinnerMode} from '~/composables/useBookingValidation'

interface Props {
  household: HouseholdDetail
}

const props = defineProps<Props>()


// Store integration
const householdsStore = useHouseholdsStore()
const planStore = usePlanStore()
const {activeSeason} = storeToRefs(planStore)

// Ticket business logic
const {getTicketTypeConfig} = useTicket()

// Household business logic
const {computeAggregatedPreferences} = useHousehold()

// Inject responsive breakpoint
const isMd = inject<Ref<boolean>>('isMd')
const getIsMd = computed((): boolean => isMd?.value ?? false)

// Design system
const { WEEKDAY, COMPONENTS } = useTheSlopeDesignSystem()

// Prepare table data with synthetic "all members" power row + individual inhabitants
const tableData = computed(() => {
  const inhabitants = props.household.inhabitants.map(inhabitant => ({
    ...inhabitant,
    ticketConfig: getTicketTypeConfig(inhabitant.birthDate ?? null, activeSeason.value?.ticketPrices),
    isSynthetic: false
  }))

  // Create synthetic "all members" power row
  const aggregatedPrefs = computeAggregatedPreferences(props.household.inhabitants)
  const powerRow = {
    id: -1,
    name: 'Alle medlemmer',
    lastName: '',
    heynaboId: -1,
    pictureUrl: null,
    birthDate: null,
    dinnerPreferences: aggregatedPrefs,
    ticketConfig: {label: 'Powermode!', color: 'warning' as const},
    isSynthetic: true,
    inhabitants: props.household.inhabitants // For group display
  }

  return [powerRow, ...inhabitants]
})

// Expandable row state
const expanded = ref<Record<number, boolean>>({})

// Draft preferences (edited before save)
const draftPreferences = ref<WeekDayMap<DinnerMode> | null>(null)
const editingInhabitantId = ref<number | null>(null)

// Save preferences
const savePreferences = async () => {
  if (editingInhabitantId.value === null || !draftPreferences.value) return

  try {
    // Power mode: update all inhabitants
    if (editingInhabitantId.value === -1) {
      await householdsStore.updateAllInhabitantPreferences(props.household.id, draftPreferences.value)
    }
    // Regular mode: update single inhabitant
    else {
      await householdsStore.updateInhabitantPreferences(editingInhabitantId.value, draftPreferences.value)
    }

    // Close the row after save
    expanded.value = {}
    editingInhabitantId.value = null
    draftPreferences.value = null
  } catch (error) {
    console.error('Failed to update preferences:', error)
  }
}

// Update draft when editing
const updateDraft = (preferences: WeekDayMap<DinnerMode>) => {
  draftPreferences.value = preferences
}

// Handle row toggle - row is a TanStack table row
interface ToggleableRow {
  getIsExpanded: () => boolean
  toggleExpanded: () => void
  original: { id: number; dinnerPreferences?: WeekDayMap<DinnerMode> | null }
}
const handleToggleRow = (row: ToggleableRow) => {
  if (!row.getIsExpanded()) {
    // Opening - initialize draft from preferences (or null if none)
    editingInhabitantId.value = row.original.id
    draftPreferences.value = row.original.dinnerPreferences ?? null
  } else {
    // Closing - clear draft
    editingInhabitantId.value = null
    draftPreferences.value = null
  }
  row.toggleExpanded()
}

// Filter weekdays based on active season cooking days
const visibleDays = computed(() => {
  if (!activeSeason.value?.cookingDays) return WEEKDAYS
  return WEEKDAYS.filter(day => activeSeason.value!.cookingDays[day])
})

// Table columns
const columns = [
  {
    id: 'expand'
  },
  {
    id: 'ticketType',
    header: 'Billet'
  },
  {
    id: 'name',
    header: 'Navn'
  },
  {
    id: 'preferences'
  }
]
</script>

<template>
  <!-- Weekly Preferences Section -->
  <UCard
data-test-id="household-members" class="rounded-none md:rounded-lg border-t-0 md:border-t"
         :ui="{ body: 'px-0 mb-0 md:px-4' }">
    <template #header>
      <h3 class="text-lg font-semibold">Husstandens ugentlige booking præferencer</h3>
    </template>

    <div class="space-y-2 md:space-y-4">
      <!-- Inhabitants table with expandable preference editing -->
      <UTable
          v-model:expanded="expanded"
          :data="tableData"
          :columns="columns"
          row-key="id"
          :ui="{ tbody: '[&_tr:first-child]:bg-info/10', tr: 'data-[expanded=true]:bg-elevated/50', th: 'px-1 py-1 md:px-4 md:py-3', td: 'px-1 md:px-4' }"
      >
        <!-- Expand button column -->
        <template #expand-cell="{ row }">
          <UButton
              color="neutral"
              variant="ghost"
              :icon="row.getIsExpanded() ? 'i-heroicons-chevron-down' : (row.original.isSynthetic ? 'i-heroicons-bolt' : 'i-heroicons-pencil')"
              square
              :size="getIsMd ? 'md' : 'xs'"
              :aria-label="row.getIsExpanded() ? 'Luk' : (row.original.isSynthetic ? 'Power mode' : 'Rediger præferencer')"
              :class="row.getIsExpanded() ? 'rotate-180' : ''"
              class="transition-transform duration-200"
              @click="handleToggleRow(row)"
          />
        </template>

        <!-- Ticket type column -->
        <template #ticketType-cell="{ row }">
          <UBadge
              :color="row.original.ticketConfig?.color ?? 'neutral'"
              variant="subtle"
              size="sm"
              :data-test-id="`ticket-type-${row.original.id}`"
          >
            {{ row.original.ticketConfig?.label ?? 'Ukendt' }}
          </UBadge>
        </template>

        <!-- Name column -->
        <template #name-cell="{ row }">
          <!-- Power mode: show all family members in group -->
          <UserListItem
              v-if="row.original.isSynthetic"
              :inhabitants="household.inhabitants"
              compact
              :property-check="() => false"
              ring-color="warning"
              label="beboere"
          />
          <!-- Regular mode: show single inhabitant -->
          <UserListItem
              v-else
              :inhabitants="household.inhabitants.find(i => i.id === row.original.id) ?? household.inhabitants[0]!"
              compact
              :property-check="() => false"
              ring-color="primary"
          />
        </template>

        <!-- Preferences header (weekday labels) -->
        <template #preferences-header>
          <UFieldGroup size="sm" orientation="horizontal" :class="WEEKDAY.fieldGroupClasses">
            <DinnerModeSelector
              v-for="day in visibleDays"
              :key="day"
              :model-value="day"
              size="sm"
              :name="`weekday-header-${day}`"
            />
          </UFieldGroup>
        </template>

        <!-- Preferences column (collapsed state - VIEW badges) -->
        <template #preferences-cell="{ row }">
          <WeekDayMapDinnerModeDisplay
              :model-value="row.original.dinnerPreferences"
              :form-mode="FORM_MODES.VIEW"
              :parent-restriction="activeSeason?.cookingDays"
              :show-labels="false"
              :name="`inhabitant-${row.original.id}-preferences-view`"
          />
        </template>

        <!-- Expanded row: EDIT mode preferences -->
        <template #expanded="{ row }">
          <UCard
              :color="row.original.isSynthetic ? COMPONENTS.powerMode.card.color : 'primary'"
              :variant="COMPONENTS.powerMode.card.variant"
              class="max-w-full overflow-x-auto"
              :ui="{ body: 'p-4 flex flex-col gap-4', footer: 'p-4', header: 'p-4' }"
          >
            <template #header>
              <!-- Power mode header -->
              <h4 class="text-md font-semibold text-balance">
                {{ row.original.isSynthetic ? 'Power mode: Opdater præferencer for hele husstanden' : `Opdater fællesspisning præferencer for ${row.original.name}` }}
              </h4>
            </template>

            <!-- Power mode warning alert -->
            <UAlert
                v-if="row.original.isSynthetic"
                :icon="COMPONENTS.powerMode.alert.icon"
                :color="COMPONENTS.powerMode.alert.color"
                :variant="COMPONENTS.powerMode.alert.variant"
                title="Du er ved at aktivere power mode"
                :description="`Her kan du editere hele familien på en gang. Ændringer påvirker alle ${household.inhabitants.length} medlemmer i husstanden. Individuelle præferencer overskrives.`"
                class="min-w-0"
                :ui="{ title: 'break-words', description: 'break-words' }"
            />

            <!-- Preference editor -->
            <WeekDayMapDinnerModeDisplay
                :model-value="draftPreferences"
                :form-mode="FORM_MODES.EDIT"
                :parent-restriction="activeSeason?.cookingDays"
                :show-labels="true"
                :name="`inhabitant-${row.original.id}-preferences-edit`"
                @update:model-value="updateDraft"
            />

            <template #footer>
              <div class="flex justify-start md:justify-end gap-2">
                <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-x-mark"
                    :size="getIsMd ? 'md' : 'sm'"
                    name="cancel-preferences"
                    @click="handleToggleRow(row)"
                >
                  Annuller
                </UButton>
                <UButton
                    :color="row.original.isSynthetic ? COMPONENTS.powerMode.color : 'primary'"
                    variant="solid"
                    :icon="row.original.isSynthetic ? COMPONENTS.powerMode.buttonIcon : 'i-heroicons-check'"
                    :size="getIsMd ? 'md' : 'sm'"
                    name="save-preferences"
                    @click="savePreferences"
                >
                  {{ row.original.isSynthetic ? 'Gem for alle' : 'Gem' }}
                </UButton>
              </div>
            </template>
          </UCard>
        </template>
      </UTable>

      <!-- Info alert -->
      <UAlert
          icon="i-heroicons-information-circle"
          color="primary"
          variant="soft"
          title="Sådan redigerer du præferencer"
          description="⚡ Power mode opdaterer alle medlemmer samtidigt • ✏️ Klik på blyanten for at redigere enkeltpersoner • ▼ Udvid rækken for at se valgmuligheder • Ændringer gemmes når du trykker på GEM, og påvirker fremtidige bookinger"
      />
    </div>
  </UCard>
</template>
