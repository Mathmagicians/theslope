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
import type {DinnerMode, ScaffoldResult} from '~/composables/useBookingValidation'

interface Props {
  household: HouseholdDetail
}

const props = defineProps<Props>()


// Store integration
const householdsStore = useHouseholdsStore()
const {lastPreferenceResult} = storeToRefs(householdsStore)
const planStore = usePlanStore()
const {activeSeason} = storeToRefs(planStore)

// Ticket business logic
const {getTicketTypeConfig} = useTicket()

// Household business logic
const {computeAggregatedPreferences} = useHousehold()

// Booking business logic
const {formatScaffoldResult} = useBooking()

// Inject responsive breakpoint
const isMd = inject<Ref<boolean>>('isMd')
const getIsMd = computed((): boolean => isMd?.value ?? false)

// Design system
const { WEEKDAY, COMPONENTS, COLOR, ICONS } = useTheSlopeDesignSystem()

// Prepare table data with synthetic "all members" power row + individual inhabitants
const tableData = computed(() => {
  const inhabitants = props.household.inhabitants.map(inhabitant => ({
    ...inhabitant,
    ticketConfig: getTicketTypeConfig(inhabitant.birthDate ?? null, activeSeason.value?.ticketPrices),
    isSynthetic: false,
    consensus: undefined  // Only power row has consensus
  }))

  // Create synthetic "all members" power row
  const { preferences: aggregatedPrefs, consensus } = computeAggregatedPreferences(props.household.inhabitants)
  const powerRow = {
    id: -1,
    name: 'Alle medlemmer',
    lastName: '',
    heynaboId: -1,
    pictureUrl: null,
    birthDate: null,
    dinnerPreferences: aggregatedPrefs,
    consensus,
    ticketConfig: {label: 'Powermode!', color: 'warning' as const},
    isSynthetic: true,
    inhabitants: props.household.inhabitants // For group display
  }

  return [powerRow, ...inhabitants]
})

// Draft preferences (edited before save)
const draftPreferences = ref<WeekDayMap<DinnerMode> | null>(null)
const editingInhabitantId = ref<number | null>(null)
const isSaving = ref(false)

// Expandable row state - single expansion enforced by composable
const { expanded } = useExpandableRow({
  onExpand: (rowIndex) => {
    const row = tableData.value[rowIndex]
    if (row) {
      editingInhabitantId.value = row.id
      draftPreferences.value = row.dinnerPreferences ?? null
    }
  },
  onCollapse: () => {
    editingInhabitantId.value = null
    draftPreferences.value = null
  }
})

// Toast notifications
const toast = useToast()

// Save preferences
const savePreferences = async () => {
  if (editingInhabitantId.value === null || !draftPreferences.value) return

  isSaving.value = true
  const isPowerMode = editingInhabitantId.value === -1

  try {
    let result: ScaffoldResult

    // Power mode: update all inhabitants
    if (isPowerMode) {
      result = await householdsStore.updateAllInhabitantPreferences(props.household.id, draftPreferences.value)
    }
    // Regular mode: update single inhabitant
    else {
      result = await householdsStore.updateInhabitantPreferences(editingInhabitantId.value, draftPreferences.value)
    }

    toast.add({
      title: isPowerMode ? 'Alle præferencer opdateret' : 'Præferencer opdateret',
      description: formatScaffoldResult(result),
      icon: 'i-heroicons-check-circle',
      color: 'success'
    })

    // Close the row after save
    expanded.value = {}
    editingInhabitantId.value = null
    draftPreferences.value = null
  } catch (error) {
    console.error('Failed to update preferences:', error)
    toast.add({
      title: 'Kunne ikke gemme',
      description: 'Der opstod en fejl. Prøv igen senere.',
      icon: 'i-heroicons-exclamation-circle',
      color: 'error'
    })
  } finally {
    isSaving.value = false
  }
}

// Update draft when editing
const updateDraft = (preferences: WeekDayMap<DinnerMode>) => {
  draftPreferences.value = preferences
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
    id: 'name',
    header: 'Navn'
  },
  {
    id: 'ticketType',
    header: 'Billet'
  },
  {
    id: 'preferences'
  }
]
</script>

<template>
  <!-- Weekly Preferences Section -->
  <UCard
data-testid="household-members" class="rounded-none md:rounded-lg border-t-0 md:border-t"
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
              :data-testid="row.original.isSynthetic ? 'power-mode-toggle' : `inhabitant-${row.original.id}-edit-preferences`"
              :class="[
                row.getIsExpanded() ? 'rotate-180' : '',
                row.original.isSynthetic && !row.getIsExpanded() ? 'hover:animate-pulse hover:scale-125 hover:rotate-45 hover:text-warning active:scale-175 active:rotate-[720deg] active:text-error' : ''
              ]"
              class="transition-all duration-700"
              @click="row.toggleExpanded()"
          />
        </template>

        <!-- Ticket type column -->
        <template #ticketType-cell="{ row }">
          <UBadge
              :color="row.original.ticketConfig?.color ?? 'neutral'"
              variant="subtle"
              size="sm"
              :data-testid="`ticket-type-${row.original.id}`"
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
              :show-names="false"
              ring-color="warning"
              label="beboere"
          />
          <!-- Regular mode: show single inhabitant -->
          <UserListItem
              v-else
              :inhabitants="household.inhabitants.find(i => i.id === row.original.id) ?? household.inhabitants[0]!"
              compact
              ring-color="primary"
          >
            <template #badge="{ inhabitant }">
              <span v-if="inhabitant.birthDate" class="text-xs text-muted flex items-center gap-1">
                <UIcon name="i-heroicons-cake" class="size-4 md:size-6" />
                {{ formatDate(inhabitant.birthDate) }}
              </span>
            </template>
          </UserListItem>
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
              :consensus="row.original.consensus"
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
                :consensus="row.original.consensus"
                :name="row.original.isSynthetic ? 'power-mode-preferences-edit' : `inhabitant-${row.original.id}-preferences-edit`"
                @update:model-value="updateDraft"
            />

            <template #footer>
              <div class="flex justify-start md:justify-end gap-2">
                <UButton
                    :color="COLOR.neutral"
                    variant="ghost"
                    :icon="ICONS.xMark"
                    :size="getIsMd ? 'md' : 'sm'"
                    data-testid="cancel-preferences"
                    @click="row.toggleExpanded()"
                >
                  Annuller
                </UButton>
                <UButton
                    :color="row.original.isSynthetic ? COMPONENTS.powerMode.color : COLOR.primary"
                    variant="solid"
                    :size="getIsMd ? 'md' : 'sm'"
                    :loading="false"
                    :disabled="isSaving"
                    class="group"
                    data-testid="save-preferences"
                    @click="savePreferences"
                >
                  <template #leading>
                    <UIcon
                      :name="row.original.isSynthetic ? COMPONENTS.powerMode.buttonIcon : ICONS.check"
                      :class="[
                        'transition-all duration-700',
                        row.original.isSynthetic && isSaving ? 'animate-spin' : '',
                        row.original.isSynthetic && !isSaving ? 'group-hover:animate-pulse group-hover:scale-125 group-hover:rotate-12 group-active:rotate-[360deg]' : ''
                      ]"
                    />
                  </template>
                  {{ isSaving ? 'Arbejder...' : (row.original.isSynthetic ? 'Gem for alle' : 'Gem') }}
                </UButton>
              </div>
            </template>
          </UCard>
        </template>
      </UTable>

      <!-- Last operation result (persistent, subtle) -->
      <UAlert
          v-if="lastPreferenceResult"
          :icon="lastPreferenceResult.errored > 0 ? ICONS.robotDead : ICONS.robotHappy"
          :color="lastPreferenceResult.errored > 0 ? 'error' : 'neutral'"
          variant="subtle"
          title="Sidste ændring"
          :description="`Du har ændret præferencer, og familiens bookinger har ændret sig: ${formatScaffoldResult(lastPreferenceResult)}`"
          data-testid="last-result-alert"
      />

      <!-- Info alert -->
      <UAlert
          icon="i-heroicons-information-circle"
          color="primary"
          variant="soft"
          title="Sådan redigerer du præferencer"
      >
        <template #description>
          <div class="flex flex-col gap-1">
            <span class="flex items-center gap-1">
              <UIcon name="i-heroicons-bolt" class="size-4" /> Power mode opdaterer alle medlemmer samtidigt - ændringer opdaterer fremtidige tilmeldinger
            </span>
            <span class="flex items-center gap-1">
              <UIcon name="i-heroicons-pencil" class="size-4" /> Klik på blyanten for at redigere enkeltpersoner
            </span>
            <span>Ændringer gemmes når du trykker på GEM, og påvirker fremtidige bookinger</span>
            <span class="flex items-center gap-1 mt-1">
              <strong>Valg for fællesspisning:</strong>
              <UIcon name="i-streamline-food-kitchenware-spoon-plate-fork-plate-food-dine-cook-utensils-eat-restaurant-dining" class="size-4" /> Fællesspisning
              <UIcon name="i-heroicons-clock" class="size-4" /> Sen spisning
              <UIcon name="i-heroicons-shopping-bag" class="size-4" /> Takeaway
              <UIcon name="i-heroicons-x-circle" class="size-4" /> Ingen spisning
            </span>
          </div>
        </template>
      </UAlert>
    </div>
  </UCard>
</template>
