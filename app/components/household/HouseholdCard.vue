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
  canEdit?: boolean
  adminBypass?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  canEdit: true,
  adminBypass: false
})


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

// Design system
const { WEEKDAY, COMPONENTS, COLOR, ICONS, BUTTONS, SIZES, ALERTS, NOISE, ORIENTATIONS, TABLE_COLUMNS } = useTheSlopeDesignSystem()
const { powerMode } = COMPONENTS

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
    ticketConfig: powerMode.ticketConfig,
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
      result = await householdsStore.updateAllInhabitantPreferences(props.household.id, draftPreferences.value, props.adminBypass)
    }
    // Regular mode: update single inhabitant
    else {
      result = await householdsStore.updateInhabitantPreferences(editingInhabitantId.value, draftPreferences.value, props.adminBypass)
    }

    toast.add({
      title: isPowerMode ? 'Alle præferencer opdateret' : 'Præferencer opdateret',
      description: formatScaffoldResult(result, 'past'),
      icon: ICONS.checkCircle,
      color: COLOR.success
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
      icon: ICONS.exclamationCircle,
      color: COLOR.error
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

// Table columns - 3 columns on mobile (toggle, name+ticket, modes), 4 on desktop
const columns = computed(() => [
  { id: 'expand' },
  { id: 'name', ...TABLE_COLUMNS.householdMemberName },
  { id: 'ticketType', ...TABLE_COLUMNS.householdTicketType },
  { id: 'preferences' }
])
</script>

<template>
  <!-- Weekly Preferences Section -->
  <UCard
data-testid="household-members" v-bind="COMPONENTS.householdAllergies.card">
    <template #header>
      <h3 :class="COMPONENTS.householdCard.title">Husstandens ugentlige booking præferencer</h3>
    </template>

    <div :class="COMPONENTS.householdCard.stack">
      <!-- Inhabitants table with expandable preference editing -->
      <UTable
          v-model:expanded="expanded"
          :data="tableData"
          :columns="columns"
          row-key="id"
          :ui="COMPONENTS.table.householdPreferencesUi"
      >
        <!-- Expand button column - only shown when canEdit -->
        <template #expand-cell="{ row }">
          <UButton
              v-if="canEdit"
              v-bind="BUTTONS.edit"
              :icon="row.getIsExpanded() ? ICONS.chevronDown : (row.original.isSynthetic ? COMPONENTS.powerMode.buttonIcon : BUTTONS.edit.icon)"
              :aria-label="row.getIsExpanded() ? 'Luk' : (row.original.isSynthetic ? 'Power mode' : 'Rediger præferencer')"
              :data-testid="row.original.isSynthetic ? 'power-mode-toggle' : `inhabitant-${row.original.id}-edit-preferences`"
              :class="[
                COMPONENTS.householdCard.expandToggle,
                row.getIsExpanded() && COMPONENTS.householdCard.expandToggleOpen,
                row.original.isSynthetic && !row.getIsExpanded() && COMPONENTS.householdCard.powerToggleIdle
              ]"
              @click="row.toggleExpanded()"
          />
        </template>

        <!-- Ticket type column (desktop only) -->
        <template #ticketType-cell="{ row }">
          <div :class="COMPONENTS.householdCard.ticketDesktop">
            <UBadge
                :color="row.original.ticketConfig?.color ?? COLOR.neutral"
                :variant="NOISE.subtle"
                :size="SIZES.sm"
                :data-testid="`ticket-type-${row.original.id}`"
            >
              {{ row.original.ticketConfig?.label ?? 'Ukendt' }}
            </UBadge>
          </div>
        </template>

        <!-- Name column - includes ticket badge on mobile -->
        <template #name-cell="{ row }">
          <div :class="COMPONENTS.householdCard.nameCell">
            <!-- Power mode: show all family members in group -->
            <UserListItem
                v-if="row.original.isSynthetic"
                :inhabitants="household.inhabitants"
                compact
                :show-names="false"
                :ring-color="COLOR.warning"
                label="beboere"
            />
            <!-- Regular mode: show single inhabitant -->
            <UserListItem
                v-else
                :inhabitants="household.inhabitants.find(i => i.id === row.original.id) ?? household.inhabitants[0]!"
                compact
                :ring-color="COLOR.primary"
            />
            <!-- Ticket badge - mobile only (under name) -->
            <UBadge
                :class="COMPONENTS.householdCard.ticketPhone"
                :color="row.original.ticketConfig?.color ?? COLOR.neutral"
                :variant="NOISE.subtle"
                :size="SIZES.xs"
            >
              {{ row.original.ticketConfig?.label ?? 'Ukendt' }}
            </UBadge>
          </div>
        </template>

        <!-- Preferences header (weekday labels) -->
        <template #preferences-header>
          <UFieldGroup :size="SIZES.standard" :orientation="ORIENTATIONS.horizontal" :class="WEEKDAY.fieldGroupClasses">
            <DinnerModeSelector
              v-for="day in visibleDays"
              :key="day"
              :model-value="day"
              :size="SIZES.standard"
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
              :size="SIZES.standard"
              :name="`inhabitant-${row.original.id}-preferences-view`"
          />
        </template>

        <!-- Expanded row: EDIT mode preferences -->
        <template #expanded="{ row }">
          <UFormField
              :label="row.original.isSynthetic ? 'Power mode: Opdater præferencer for hele husstanden' : `Opdater fællesspisning præferencer for ${row.original.name}`"
              :class="COMPONENTS.householdCard.editorField"
          >
            <div :class="COMPONENTS.householdCard.editorStack">
              <!-- Power mode warning alert -->
              <UAlert
                  v-if="row.original.isSynthetic"
                  v-bind="ALERTS.warning"
                  :icon="COMPONENTS.powerMode.icon"
                  title="Du er ved at aktivere power mode"
                  :description="`Her kan du editere hele familien på en gang. Ændringer påvirker alle ${household.inhabitants.length} medlemmer i husstanden. Individuelle præferencer overskrives.`"
              />

              <!-- Preference editor -->
              <WeekDayMapDinnerModeDisplay
                  :model-value="draftPreferences"
                  :form-mode="FORM_MODES.EDIT"
                  :parent-restriction="activeSeason?.cookingDays"
                  :show-labels="true"
                  :consensus="row.original.consensus"
                  :size="SIZES.standard"
                  :name="row.original.isSynthetic ? 'power-mode-preferences-edit' : `inhabitant-${row.original.id}-preferences-edit`"
                  @update:model-value="updateDraft"
              />

              <!-- Actions grouped -->
              <div :class="COMPONENTS.householdCard.actionsRow">
                <UFieldGroup :size="SIZES.cardFieldGroup">
                  <UButton
                      :color="COLOR.neutral"
                      :variant="NOISE.quiet"
                      :icon="ICONS.xMark"
                      data-testid="cancel-preferences"
                      @click="row.toggleExpanded()"
                  >
                    Annuller
                  </UButton>
                  <UButton
                      v-if="canEdit"
                      :color="row.original.isSynthetic ? COMPONENTS.powerMode.color : COLOR.primary"
                      :variant="NOISE.loud"
                      :loading="isSaving"
                      :disabled="isSaving"
                      :class="COMPONENTS.householdCard.saveButton"
                      data-testid="save-preferences"
                      @click="savePreferences"
                  >
                    <template #leading>
                      <UIcon
                        :name="row.original.isSynthetic ? COMPONENTS.powerMode.buttonIcon : ICONS.check"
                        :class="[
                          COMPONENTS.householdCard.saveIcon,
                          row.original.isSynthetic && isSaving && COMPONENTS.householdCard.saveIconSaving,
                          row.original.isSynthetic && !isSaving && COMPONENTS.householdCard.saveIconIdle
                        ]"
                      />
                    </template>
                    {{ isSaving ? 'Arbejder...' : (row.original.isSynthetic ? 'Gem for alle' : 'Gem') }}
                  </UButton>
                </UFieldGroup>
              </div>
            </div>
          </UFormField>
        </template>
      </UTable>

      <!-- Last operation result (persistent, subtle) -->
      <UAlert
          v-if="lastPreferenceResult"
          v-bind="lastPreferenceResult.errored > 0 ? ALERTS.error : ALERTS.neutral"
          :icon="lastPreferenceResult.errored > 0 ? ICONS.robotDead : ICONS.robotHappy"
          title="Sidste ændring"
          :description="`Du har ændret præferencer, og familiens bookinger har ændret sig: ${formatScaffoldResult(lastPreferenceResult, 'past')}`"
          data-testid="last-result-alert"
      />

      <!-- Info alert -->
      <UAlert
          v-bind="ALERTS.info"
          title="Sådan redigerer du præferencer"
      >
        <template #description>
          <div :class="COMPONENTS.householdCard.hintList">
            <span :class="COMPONENTS.householdCard.hintLine">
              <UIcon :name="COMPONENTS.powerMode.buttonIcon" :class="COMPONENTS.householdCard.hintIcon" /> Power mode opdaterer alle medlemmer samtidigt - ændringer opdaterer fremtidige tilmeldinger
            </span>
            <span :class="COMPONENTS.householdCard.hintLine">
              <UIcon :name="ICONS.edit" :class="COMPONENTS.householdCard.hintIcon" /> Klik på blyanten for at redigere enkeltpersoner
            </span>
            <span>Ændringer gemmes når du trykker på GEM, og påvirker fremtidige bookinger</span>
            <span :class="COMPONENTS.householdCard.hintModes">
              <strong>Valg for fællesspisning:</strong>
              <UIcon :name="ICONS.dinner" :class="COMPONENTS.householdCard.hintIcon" /> Fællesspisning
              <UIcon :name="ICONS.clock" :class="COMPONENTS.householdCard.hintIcon" /> Sen spisning
              <UIcon :name="ICONS.takeaway" :class="COMPONENTS.householdCard.hintIcon" /> Takeaway
              <UIcon :name="ICONS.noDinner" :class="COMPONENTS.householdCard.hintIcon" /> Ingen spisning
            </span>
          </div>
        </template>
      </UAlert>
    </div>
  </UCard>
</template>
