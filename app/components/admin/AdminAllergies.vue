<!--
ONE responsive tree (LAYOUTS.masterDetailPage) - no md:hidden branching, so every
interaction exists at every breakpoint.

DESKTOP (md+) - 3/9 split
┌────────────────────────────────────────────────────────────────────────────────┐
│ Allergi Katalog                    [📄 Plakat]  [👁 Vis][✏️ Rediger][＋ Opret]  │
├────────────────────────────────────────────────────────────────────────────────┤
│ ℹ️ Allergi-ansvarlige: [Alice] [Bob]                                            │
├────────────────────────────────────────────────────────────────────────────────┤
│ [⧉ Sammenlign]  [↓ Antal]                                                       │
├──────────────────────────┬─────────────────────────────────────────────────────┤
│ MASTER  .left (span 3)   │ DETAIL  .center (span 9)                            │
│ ┌──────────────────────┐ │ ┌─────────────────────────────────────────────────┐ │
│ │ 🥛 Mælk       2  🆕  │ │ │ Detaljer                            [✏️]  [🗑]  │ │
│ │ 🥜 Jordnødder 2      │ │ │ 🥜 Jordnødder                                   │ │
│ │ 🌾 Gluten     1      │ │ │ Allergi med proteiner...                        │ │
│ └──────────────────────┘ │ │ Berørte beboere (2)                             │ │
│                          │ │  👤 Anna Testsen · TV 42                        │ │
│                          │ └─────────────────────────────────────────────────┘ │
└──────────────────────────┴─────────────────────────────────────────────────────┘

MOBILE (<md) - same components, stacked
┌────────────────────────────┐
│ Allergi Katalog            │
│ [👁 Vis][✏️ Rediger][＋]    │
├────────────────────────────┤
│ [⧉ Sammenlign            ] │  full-width tap targets
│ [↓ Antal                 ] │
├────────────────────────────┤
│ 🥛 Mælk         2   🆕     │  MASTER full width
│ 🥜 Jordnødder   2          │
├────────────────────────────┤
│ Detaljer        [✏️]  [🗑] │  DETAIL stacks below
│ 🥜 Jordnødder              │
└────────────────────────────┘

FormModeSelector in header toggles VIEW/EDIT/CREATE. In EDIT/CREATE the detail
region swaps to AllergyTypeCard mode="edit" (no allergyType = create).
Multiselect mode replaces master+detail with AllergenMultiSelector.
-->
<script setup lang="ts">
import type {AllergyTypeDisplay} from '~/composables/useAllergyValidation'
import {FORM_MODES, type FormMode} from '~/types/form'

// Props - canEdit from parent for authorization (Admin OR AllergyManager)
interface Props {
  canEdit?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  canEdit: false
})

// Design system
const { COLOR, COMPONENTS, SIZES, LAYOUTS, BUTTONS, ICONS } = useTheSlopeDesignSystem()

// Business logic
const { hasNewAllergyInhabitants } = useAllergy()

// Household shortnames for the detail card - owned here, passed down as a plain map
const householdsStore = useHouseholdsStore()
const {households} = storeToRefs(householdsStore)
householdsStore.initHouseholdsStore()

const householdShortNames = computed(() =>
    Object.fromEntries(households.value.map(h => [h.id, h.shortName]))
)

// STORE
const store = useAllergiesStore()
const {
  allergyTypes,
  isAllergyTypesLoading,
  isAllergyTypesErrored,
  allergyTypesError
} = storeToRefs(store)
const {createAllergyType, updateAllergyType, deleteAllergyType} = store

// Initialize store
store.initAllergiesStore()

// SELECTION STATE
const selectedAllergyTypeId = ref<number | null>(null)
// Falls back to the first entry, so a selection always exists once data is loaded.
// Derived rather than assigned, so server and client resolve it identically.
const selectedAllergyType = computed(() =>
    allergyTypes.value.find(at => at.id === selectedAllergyTypeId.value) ?? allergyTypes.value[0] ?? null
)

// MULTISELECT STATE
const multiselectMode = ref(false)
const selectedAllergyIds = ref<number[]>([])

// SORT STATE
const isSorted = ref<'asc' | 'desc'>('desc')
const sortedAllergyTypes = computed(() => {
  const sorted = [...allergyTypes.value]
  sorted.sort((a, b) => {
    const countA = a.inhabitants?.length || 0
    const countB = b.inhabitants?.length || 0
    return isSorted.value === 'desc' ? countB - countA : countA - countB
  })
  return sorted
})

const toggleSortOrder = () => {
  isSorted.value = isSorted.value === 'asc' ? 'desc' : 'asc'
}

// Toggle multiselect mode
const toggleMultiselectMode = () => {
  multiselectMode.value = !multiselectMode.value
  if (!multiselectMode.value) {
    selectedAllergyIds.value = []
  }
}

// FORM STATE
const formMode = ref<FormMode>(FORM_MODES.VIEW)
const editingId = ref<number | null>(null)

// MODE CHANGE HANDLER - only EDIT targets an existing type, VIEW/CREATE start clean
const onModeChange = (mode: FormMode) => {
  const editTarget = selectedAllergyType.value?.id ?? null
  formMode.value = mode
  editingId.value = mode === FORM_MODES.EDIT ? editTarget : null
}

// The detail region shows the form in both EDIT and CREATE
const isFormMode = computed(() => formMode.value !== FORM_MODES.VIEW)

// Type being edited - undefined in CREATE so AllergyTypeCard renders an empty form
const editingAllergyType = computed(() => {
  if (formMode.value !== FORM_MODES.EDIT) return undefined
  return selectedAllergyType.value ?? undefined
})

// ACTIONS
const startCreate = () => {
  onModeChange(FORM_MODES.CREATE)
}

const startEdit = () => {
  onModeChange(FORM_MODES.EDIT)
}

const cancelEdit = () => {
  onModeChange(FORM_MODES.VIEW)
}

const handleSubmit = async (data: { name: string, description: string, icon?: string }) => {
  try {
    if (formMode.value === FORM_MODES.CREATE) {
      await createAllergyType(data)
      showSuccessToast('Allergi oprettet', `${data.name} er tilføjet til kataloget`)
    } else if (formMode.value === FORM_MODES.EDIT && editingId.value) {
      await updateAllergyType(editingId.value, data)
      showSuccessToast('Allergi opdateret', `${data.name} er opdateret`)
    }
    cancelEdit()
  } catch (error) {
    console.error('🥜 > AdminAllergies > Error submitting:', error)
  }
}

// DELETE - inline confirm, so the cascade to inhabitants is visible before it happens
const isConfirmingDelete = ref(false)
const isDeleting = ref(false)

const startDelete = () => {
  isConfirmingDelete.value = true
}

const cancelDelete = () => {
  isConfirmingDelete.value = false
}

// Deleting the type cascades to every Allergy row referencing it (ADR-005)
const affectedInhabitantCount = computed(() => selectedAllergyType.value?.inhabitants?.length ?? 0)

const confirmDelete = async () => {
  const allergyType = selectedAllergyType.value
  if (!allergyType) return
  isDeleting.value = true
  try {
    await deleteAllergyType(allergyType.id!)
    showSuccessToast('Allergi slettet', `${allergyType.name} er fjernet fra kataloget`)
  } catch (error) {
    console.error('🥜 > AdminAllergies > Error deleting:', error)
  } finally {
    isDeleting.value = false
    isConfirmingDelete.value = false
  }
}

// UTILITY
const showSuccessToast = (title: string, description?: string) => {
  const toast = useToast()
  toast.add({
    title,
    description,
    icon: 'i-heroicons-check-circle',
    color: 'success'
  })
}

// ACTIONS
const handleRowClick = (allergyType: AllergyTypeDisplay) => {
  // Only handle single select mode (multiselect is handled by AllergenMultiSelector)
  if (!multiselectMode.value) {
    selectedAllergyTypeId.value = allergyType.id || null
    // In CREATE mode, switch back to VIEW
    if (formMode.value === FORM_MODES.CREATE) {
      onModeChange(FORM_MODES.VIEW)
    }
  }
}

// Helper to check if a row is selected (only used in single-select mode)
const isRowSelected = (allergyTypeId: number) => {
  return allergyTypeId === selectedAllergyType.value?.id
}

// ROW SELECTION for TanStack Table (only used in single-select mode)
const rowSelection = computed(() => {
  const selection: Record<number, boolean> = {}

  if (!multiselectMode.value && selectedAllergyType.value) {
    // Find the index of the selected allergy
    const index = sortedAllergyTypes.value.findIndex(a => a.id === selectedAllergyType.value?.id)
    if (index !== -1) {
      selection[index] = true
    }
  }

  return selection
})

// TABLE COLUMNS (only used in single-select mode)
const columns = [
  {
    accessorKey: 'icon',
    header: ''
  },
  {
    accessorKey: 'name',
    header: 'Allergen'
  },
  {
    accessorKey: 'count',
    header: 'Antal'
  },
  {
    accessorKey: 'new',
    header: 'Nyt'
  }
]

// Tighter horizontal cell padding - the catalog lives in the narrow master column
const tableUi = {
  ...COMPONENTS.table.ui,
  td: `${COMPONENTS.table.ui.td} px-1`,
  th: 'px-1'
}

// Funny empty state message for allergy catalog
const catalogEmptyState = {
  emoji: '🎉',
  text: 'Kataloget er tomt - men,  kan alle mon spise alt ?',
  description: 'Tilføj allergener for at komme i gang'
}
</script>

<template>
  <div>
    <ViewError
        v-if="isAllergyTypesErrored"
        text="Kan ikke hente allergi katalog"
        :error="allergyTypesError?.statusCode"
        :cause="allergyTypesError"
    />

    <UCard
        data-testid="admin-allergies"
        class="w-full px-0"
    >
      <template #header>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col md:flex-row items-center justify-between gap-4">
            <div class="text-lg font-semibold">Allergi Katalog</div>
            <div class="flex items-center gap-2">
              <UButton
                  color="secondary"
                  variant="outline"
                  :icon="ICONS.document"
                  to="/admin/allergies/pdf"
                  target="_blank"
                  name="pdf-poster-button"
              >

                Plakat
              </UButton>
            </div>
          </div>
          <AllergyManagersList/>
        </div>
      </template>

      <!-- Single root in the card body - a multi-root slot hydrates as a fragment -->
      <div>
      <!-- Toolbar - ONE instance, serves both compare and single-select modes -->
      <div :class="[LAYOUTS.cardActionRow, 'mb-4']">
        <UButton
            v-bind="BUTTONS.secondaryAction"
            :class="LAYOUTS.cardActionButton"
            :color="COLOR.secondary"
            :icon="multiselectMode ? ICONS.xMark : ICONS.compare"
            data-testid="multiselect-toggle"
            @click="toggleMultiselectMode"
        >
          {{ multiselectMode ? 'Afslut sammenligning' : 'Sammenlign' }}
        </UButton>

        <UButton
            v-bind="BUTTONS.secondaryAction"
            :class="LAYOUTS.cardActionButton"
            :color="COLOR.secondary"
            :icon="isSorted === 'asc' ? ICONS.sortAscending : ICONS.sortDescending"
            data-testid="sort-by-count"
            @click="toggleSortOrder"
        >
          Antal
        </UButton>

        <UButton
            v-if="props.canEdit"
            v-bind="BUTTONS.primaryAction"
            :class="LAYOUTS.cardActionButton"
            :color="COLOR.primary"
            :icon="ICONS.plusCircle"
            data-testid="create-allergy-type"
            @click="startCreate"
        >
          Opret allergi
        </UButton>
      </div>

      <!-- COMPARE MODE -->
      <AllergenMultiSelector
          v-if="multiselectMode"
          v-model="selectedAllergyIds"
          :allergy-types="sortedAllergyTypes"
          mode="edit"
          :show-statistics="true"
          :show-new-badge="true"
      />

      <!-- MASTER-DETAIL - stacked on mobile, 1/3 - 2/3 from md -->
      <div v-else class="flex flex-col md:flex-row gap-4 md:gap-6">
        <!-- MASTER -->
        <div class="w-full md:w-1/3 min-w-0">
          <UTable
              v-model:row-selection="rowSelection"
              :columns="columns"
              :data="sortedAllergyTypes"
              :loading="isAllergyTypesLoading"
              :ui="tableUi"
          >
            <!-- Icon cell -->
            <template #icon-cell="{ row }">
              <div
                  :class="[
                    'flex items-center justify-center p-1 rounded-lg transition-colors',
                    COMPONENTS.table.clickableCell,
                    isRowSelected(row.original.id!) && COMPONENTS.table.selectedRow
                  ]"
                  @click="handleRowClick(row.original)"
              >
                <div class="flex items-center justify-center w-8 h-8 rounded-full ring-1 ring-red-700 shrink-0">
                  <UIcon
                      v-if="row.original.icon?.startsWith('i-')"
                      :name="row.original.icon"
                      class="text-base"
                  />
                  <span v-else class="text-base">
                    {{ row.original.icon || '🏷️' }}
                  </span>
                </div>
              </div>
            </template>

            <!-- Name cell -->
            <template #name-cell="{ row }">
              <div
                  :class="['font-medium', COMPONENTS.table.clickableCell]"
                  @click="handleRowClick(row.original)"
              >
                {{ row.original.name }}
              </div>
            </template>

            <!-- Count cell -->
            <template #count-cell="{ row }">
              <div
                  :class="['text-center', COMPONENTS.table.clickableCell]"
                  @click="handleRowClick(row.original)"
              >
                {{ row.original.inhabitants?.length || 0 }}
              </div>
            </template>

            <!-- New badge cell - shows if any allergy of this type was recently added -->
            <template #new-cell="{ row }">
              <div
                  :class="['text-center', COMPONENTS.table.clickableCell]"
                  @click="handleRowClick(row.original)"
              >
                <UIcon
                    v-if="hasNewAllergyInhabitants(row.original)"
                    :name="ICONS.new"
                    :class="COMPONENTS.rowIconClass"
                />
              </div>
            </template>

            <!-- Empty state -->
            <template #empty-state>
              <UAlert
                  variant="soft"
                  :color="COLOR.success"
                  :avatar="{ text: catalogEmptyState.emoji, size: SIZES.emptyStateAvatar }"
                  :ui="COMPONENTS.emptyStateAlert"
              >
                <template #title>
                  {{ catalogEmptyState.text }}
                </template>
                <template #description>
                  {{ catalogEmptyState.description }}
                </template>
                <template #actions>
                  <UButton
                      v-if="props.canEdit && formMode === FORM_MODES.VIEW"
                      v-bind="BUTTONS.primaryAction"
                      :color="COLOR.primary"
                      :icon="ICONS.plusCircle"
                      data-testid="create-first-allergy-type"
                      @click="startCreate"
                  >
                    Tilføj allergi
                  </UButton>
                </template>
              </UAlert>
            </template>
          </UTable>
        </div>

        <!-- DETAIL / FORM - horizontally centred, starting just below the table headers -->
        <div class="w-full md:w-2/3 min-w-0 flex justify-center items-start md:pt-10">
          <!-- DELETE CONFIRM - deleting the type cascades to every registration, so show it -->
          <div
              v-if="isConfirmingDelete && selectedAllergyType"
              data-testid="delete-allergy-type-confirm"
              class="w-full max-w-2xl space-y-4"
          >
            <UAlert
                :icon="ICONS.warning"
                :color="COLOR.neutral"
                variant="outline"
                :title="`Slet ${selectedAllergyType.name}?`"
            >
              <template #description>
                <ul class="mt-2 space-y-1">
                  <li class="flex items-center gap-2">
                    <UBadge :color="COLOR.error" variant="subtle" :size="SIZES.small">
                      <UIcon :name="ICONS.trash" class="mr-1"/>
                      Allergien fjernes fra kataloget
                    </UBadge>
                  </li>
                  <li v-if="affectedInhabitantCount > 0" class="flex items-center gap-2">
                    <UBadge :color="COLOR.error" variant="subtle" :size="SIZES.small">
                      <UIcon :name="ICONS.users" class="mr-1"/>
                      {{ affectedInhabitantCount }} beboer{{ affectedInhabitantCount === 1 ? '' : 'e' }} mister registreringen
                    </UBadge>
                  </li>
                </ul>
              </template>
            </UAlert>

            <div :class="LAYOUTS.formButtonRow">
              <UButton
                  v-bind="BUTTONS.cancel"
                  :class="LAYOUTS.cardActionButton"
                  data-testid="cancel-delete-allergy-type"
                  @click="cancelDelete"
              >
                Annuller
              </UButton>
              <UButton
                  v-bind="BUTTONS.save"
                  :class="LAYOUTS.cardActionButton"
                  :icon="ICONS.trash"
                  :loading="isDeleting"
                  data-testid="confirm-delete-allergy-type"
                  @click="confirmDelete"
              >
                Slet
              </UButton>
            </div>
          </div>

          <!-- EDIT or CREATE - no allergyType means create -->
          <AllergyTypeCard
              v-else-if="isFormMode"
              :allergy-type="editingAllergyType"
              mode="edit"
              @save="handleSubmit"
              @cancel="cancelEdit"
          />

          <!-- Selected allergy with its actions -->
          <div v-else-if="selectedAllergyType" class="w-full max-w-2xl space-y-4">
            <div class="flex items-center justify-between gap-2">
              <h3 class="text-lg font-semibold">Detaljer</h3>
              <div v-if="props.canEdit" class="flex items-center gap-2">
                <UButton
                    v-bind="BUTTONS.edit"
                    aria-label="Rediger"
                    data-testid="edit-allergy-type"
                    @click="startEdit"
                />
                <UButton
                    v-bind="BUTTONS.edit"
                    :icon="ICONS.trash"
                    aria-label="Slet"
                    data-testid="delete-allergy-type"
                    @click="startDelete"
                />
              </div>
            </div>
            <AllergyTypeCard :allergy-type="selectedAllergyType" :household-short-names="householdShortNames"/>
          </div>

          <!-- No selection -->
          <div v-else class="flex flex-col items-center justify-center py-12 text-gray-500">
            <UIcon :name="ICONS.select" class="w-8 h-8 mb-2"/>
            <p class="text-sm">Vælg en allergi for at se detaljer</p>
          </div>
        </div>
      </div>
      </div>
    </UCard>
  </div>
</template>
