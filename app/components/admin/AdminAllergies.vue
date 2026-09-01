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

// The panel face - delete confirm wins over form (edit/create) over view
const panelMode = computed(() => {
  if (isConfirmingDelete.value) return 'confirm-delete' as const
  if (formMode.value === FORM_MODES.CREATE) return 'create' as const
  if (formMode.value === FORM_MODES.EDIT) return 'edit' as const
  return 'view' as const
})

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

// ACTIONS - catalog selection (single mode); the shared table highlights via modelValue
const handleSelect = (id: number | number[] | null) => {
  if (typeof id !== 'number') return
  selectedAllergyTypeId.value = id
  // In CREATE mode, switch back to VIEW
  if (formMode.value === FORM_MODES.CREATE) {
    onModeChange(FORM_MODES.VIEW)
  }
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
          <AllergyCatalogTable
              mode="single"
              :allergy-types="sortedAllergyTypes"
              :model-value="selectedAllergyType?.id ?? null"
              :show-new-badge="true"
              :loading="isAllergyTypesLoading"
              @update:model-value="handleSelect"
          >
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
          </AllergyCatalogTable>
        </div>

        <!-- DETAIL / FORM - horizontally centred, starting just below the table headers -->
        <div class="w-full md:w-2/3 min-w-0 flex justify-center items-start md:pt-10">
          <AllergyDetailPanel
              :allergy-type="panelMode === 'create' ? undefined : (selectedAllergyType ?? undefined)"
              :panel-mode="panelMode"
              :can-edit="props.canEdit"
              :household-short-names="householdShortNames"
              :is-deleting="isDeleting"
              @edit="startEdit"
              @delete="startDelete"
              @save="handleSubmit"
              @cancel="cancelEdit"
              @confirm-delete="confirmDelete"
              @cancel-delete="cancelDelete"
          />
        </div>
      </div>
      </div>
    </UCard>
  </div>
</template>
