<script setup lang="ts">
/**
 * HouseholdCard - members and their settings - especially weekly dinner preferences
 *
 * Expandable table pattern (like HouseholdAllergies):
 * - Collapsed row: Shows ticket type, name, preferences as VIEW badges
 * - Pencil icon (✏️) on each row to expand
 * - Expanded row: Same content but WeekDayMapDinnerModeDisplay in EDIT mode (button groups)
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
 * │ │ │ [▼] Voksen  👤 Anna                                          │  │ │
 * │ │ │ ──────────────────────────────────────────────────────────── │  │ │
 * │ │ │  EXPANDED:                                                   │  │ │
 * │ │ │  Mon: [🍽️ Spis][🕐 Sen][🛍️ Take][❌ Ingen]   ← button groups │  │ │
 * │ │ │  Tue: [🍽️ Spis][🕐 Sen][🛍️ Take][❌ Ingen]                 │  │ │
 * │ │ │  Wed: [🍽️ Spis][🕐 Sen][🛍️ Take][❌ Ingen]                 │  │ │
 * │ │ │  Thu: [🍽️ Spis][🕐 Sen][🛍️ Take][❌ Ingen]                 │  │ │
 * │ │ │  Fri: [🍽️ Spis][🕐 Sen][🛍️ Take][❌ Ingen]                 │  │ │
 * │ │ │  (Active: solid success/warning/primary, Inactive: ghost)    │  │ │
 * │ │ │  (NONE: active=ghost error, inactive=ghost neutral)          │  │ │
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
 * Legend:
 * - ✏️ = Pencil icon (collapsed row - click to expand)
 * - ▼ = Chevron down (expanded row - click to collapse)
 * - 🍽️🕐🛍️❌ = Compact badges (collapsed VIEW mode)
 * - [Button] = Button groups (expanded EDIT mode)
 */
import {FORM_MODES} from '~/types/form'
import {WEEKDAY_FIELD_GROUP_CLASSES, WEEKDAY_BADGE_CONTENT_SIZE} from '~/utils/form'
import type {HouseholdWithInhabitants} from '~/composables/useHouseholdValidation'
import {WEEKDAYS, type WeekDayMap} from '~/types/dateTypes'
import type {DinnerMode} from '~/composables/useDinnerEventValidation'

interface Props {
  household: HouseholdWithInhabitants
}

const props = defineProps<Props>()


// Store integration
const householdsStore = useHouseholdsStore()
const planStore = usePlanStore()
const {activeSeason} = storeToRefs(planStore)

// Ticket business logic
const {getTicketTypeConfig} = useTicket()

// Inject responsive breakpoint
const isMd = inject<Ref<boolean>>('isMd')
const getIsMd = computed((): boolean => isMd?.value ?? false)

// Prepare table data with ticket type config
const tableData = computed(() =>
  props.household.inhabitants.map(inhabitant => ({
    ...inhabitant,
    ticketConfig: getTicketTypeConfig(inhabitant.birthDate ?? null, activeSeason.value?.ticketPrices)
  }))
)

// Expandable row state
const expanded = ref<Record<number, boolean>>({})

// Draft preferences (edited before save)
const draftPreferences = ref<WeekDayMap<DinnerMode> | null>(null)
const editingInhabitantId = ref<number | null>(null)

// Save preferences
const savePreferences = async () => {
  if (editingInhabitantId.value === null || !draftPreferences.value) return

  try {
    await householdsStore.updateInhabitantPreferences(editingInhabitantId.value, draftPreferences.value)
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

// Handle row toggle
const handleToggleRow = (row: any) => {
  if (!row.getIsExpanded()) {
    // Opening - initialize draft
    editingInhabitantId.value = row.original.id
    draftPreferences.value = row.original.dinnerPreferences ? { ...row.original.dinnerPreferences } : null
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

// Get weekday label for header (3 letters desktop, 1 letter mobile)
const getWeekdayLabel = (day: WeekDay) => {
  const compact = formatWeekdayCompact(day)
  const capitalized = compact.charAt(0).toUpperCase() + compact.slice(1)
  return getIsMd.value ? capitalized : capitalized.substring(0, 1)
}

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
  <UCard data-test-id="household-members" class="rounded-none md:rounded-lg border-t-0 md:border-t" :ui="{ body: 'px-0 mb-0 md:px-4' }">
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
          :ui="{ tr: 'data-[expanded=true]:bg-elevated/50', th: 'px-1 py-1 md:px-4 md:py-3', td: 'px-1 md:px-4' }"
      >
        <!-- Expand button column -->
        <template #expand-cell="{ row }">
          <UButton
            color="neutral"
            variant="ghost"
            :icon="row.getIsExpanded() ? 'i-heroicons-chevron-down' : 'i-heroicons-pencil'"
            square
            :size="getIsMd ? 'md' : 'xs'"
            :aria-label="row.getIsExpanded() ? 'Luk' : 'Rediger præferencer'"
            :class="row.getIsExpanded() ? 'rotate-180' : ''"
            class="transition-transform duration-200"
            @click="handleToggleRow(row)"
          />
        </template>

        <!-- Ticket type column -->
        <template #ticketType-cell="{ row }">
          <UBadge
            :color="row.original.ticketConfig.color"
            variant="subtle"
            size="sm"
            :data-test-id="`ticket-type-${row.original.id}`"
          >
            {{ row.original.ticketConfig.label }}
          </UBadge>
        </template>

        <!-- Name column -->
        <template #name-cell="{ row }">
          <UserListItem :to-display="row.original" compact :property-check="() => false" ring-color="primary" />
        </template>

        <!-- Preferences header (weekday labels) -->
        <template #preferences-header>
          <UFieldGroup :size="getIsMd ? 'md' : 'sm'" orientation="horizontal" :class="WEEKDAY_FIELD_GROUP_CLASSES">
            <div v-for="day in visibleDays" :key="day">
              <UBadge color="neutral" variant="outline" :ui="{ rounded: 'rounded-none md:rounded-md' }">
                <div :class="`${WEEKDAY_BADGE_CONTENT_SIZE} flex items-center justify-center text-xs font-medium text-gray-900 dark:text-white`">
                  {{ getWeekdayLabel(day) }}
                </div>
              </UBadge>
            </div>
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
          <UCard color="primary" variant="outline" :ui="{ body: 'p-4 flex justify-center', footer: 'p-4', header: 'p-4' }">
            <template #header>
              <h4 class="text-md font-semibold">Opdater fællesspisning præferencer for {{ row.original.name }}</h4>
            </template>

            <WeekDayMapDinnerModeDisplay
              :model-value="draftPreferences"
              :form-mode="FORM_MODES.EDIT"
              :parent-restriction="activeSeason?.cookingDays"
              :show-labels="true"
              :name="`inhabitant-${row.original.id}-preferences-edit`"
              @update:model-value="updateDraft"
            />

            <template #footer>
              <div class="flex justify-end gap-2">
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
                  color="primary"
                  variant="solid"
                  icon="i-heroicons-check"
                  :size="getIsMd ? 'md' : 'sm'"
                  name="save-preferences"
                  @click="savePreferences"
                >
                  Gem
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
        title="Standard for hver ugedag"
        description="Klik på blyanten for at redigere. Ændringer opdaterer automatisk fremtidige bookinger."
      />
    </div>
  </UCard>
</template>
