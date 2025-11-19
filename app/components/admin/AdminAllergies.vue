<!--
┌─────────────────────────────────────────────────────────────────────────────┐
│ ALLERGI KATALOG                      [📊 Vis] [✏️ Rediger] [+ Opret]       │
├─────────────────────────────────────────────────────────────────────────────┤
│ ℹ️ Allergi-ansvarlige: [Alice] [Bob]                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  MASTER (1/3)                    │  DETAIL (2/3)                            │
│ ┌────────────────────────────┐   │ ┌──────────────────────────────────────┐│
│ │ [📊 Sammenlign allergier]  │   │ │ Detaljer                             ││
│ ├────────────────────────────┤   │ ├──────────────────────────────────────┤│
│ │ 🔽 Allergi    Antal  Nyt   │   │ │ 🥜 Jordnødder                        ││
│ ├────────────────────────────┤   │ │ Allergi med proteiner...             ││
│ │ [🥛] Mælk       2     🆕   │   │ │                                      ││
│ │ [🥜] Jordnødder 2          │   │ │ Berørte beboere (2)                  ││
│ │ [🌾] Gluten     1          │   │ │ 👤 Anna Testsen                      ││
│ └────────────────────────────┘   │ │    Test Household                    ││
│                                   │ │    "Severe reaction..."              ││
│                                   │ │    for 2 timer siden                 ││
│                                   │ │                                      ││
│                                   │ │ 👤 Bob Testsen                       ││
│                                   │ │    Test Household                    ││
│                                   │ └──────────────────────────────────────┘│
│                                   │                                         │
└─────────────────────────────────────────────────────────────────────────────┘

FormModeSelector in header toggles VIEW/EDIT/CREATE modes.
Multiselect mode shows statistics instead of single allergy detail.
-->
<script setup lang="ts">
import type {AllergyType, AllergyTypeCreate, AllergyTypeUpdate} from '~/composables/useAllergyValidation'
import {FORM_MODES, type FormMode} from '~/types/form'

// Design system
const { COLOR, COMPONENTS, SIZES } = useTheSlopeDesignSystem()

// STORE
const store = useAllergiesStore()
const {
  allergyTypes,
  isAllergyTypesLoading,
  isAllergyTypesErrored,
  allergyTypesError,
  isNoAllergyTypes
} = storeToRefs(store)
const {createAllergyType, updateAllergyType, deleteAllergyType} = store

// Initialize store
store.initAllergiesStore()

// SELECTION STATE
const selectedAllergyTypeId = ref<number | null>(null)
const selectedAllergyType = computed(() =>
    allergyTypes.value.find(at => at.id === selectedAllergyTypeId.value) || null
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

// Auto-select first allergy when data loads
watch(allergyTypes, (newTypes) => {
  if (newTypes.length > 0 && !selectedAllergyTypeId.value) {
    selectedAllergyTypeId.value = newTypes[0].id || null
  }
  // If selected allergy was deleted, select first available
  if (selectedAllergyTypeId.value && !newTypes.find(at => at.id === selectedAllergyTypeId.value)) {
    selectedAllergyTypeId.value = newTypes[0]?.id || null
  }
}, {immediate: true})

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
const formData = ref<AllergyTypeCreate>({
  name: '',
  description: '',
  icon: undefined
})

// MODE CHANGE HANDLER
const onModeChange = async (mode: FormMode) => {
  formMode.value = mode
  if (mode === FORM_MODES.VIEW) {
    editingId.value = null
    formData.value = {
      name: '',
      description: '',
      icon: undefined
    }
  } else if (mode === FORM_MODES.CREATE) {
    editingId.value = null
    formData.value = {
      name: '',
      description: '',
      icon: undefined
    }
  } else if (mode === FORM_MODES.EDIT && selectedAllergyType.value) {
    editingId.value = selectedAllergyType.value.id!
    formData.value = {
      name: selectedAllergyType.value.name,
      description: selectedAllergyType.value.description,
      icon: selectedAllergyType.value.icon
    }
  }
}

// ACTIONS
const startCreate = () => {
  onModeChange(FORM_MODES.CREATE)
}

const startEdit = (allergyType: AllergyType) => {
  selectedAllergyTypeId.value = allergyType.id || null
  onModeChange(FORM_MODES.EDIT)
}

const cancelEdit = () => {
  onModeChange(FORM_MODES.VIEW)
}

const handleSubmit = async (data?: { name: string, description: string, icon?: string }) => {
  try {
    const submitData = data || formData.value
    if (formMode.value === FORM_MODES.CREATE) {
      await createAllergyType(submitData)
      showSuccessToast('Allergi oprettet', `${submitData.name} er tilføjet til kataloget`)
    } else if (formMode.value === FORM_MODES.EDIT && editingId.value) {
      await updateAllergyType(editingId.value, submitData)
      showSuccessToast('Allergi opdateret', `${submitData.name} er opdateret`)
    }
    cancelEdit()
  } catch (error) {
    console.error('🥜 > AdminAllergies > Error submitting:', error)
  }
}

const handleDelete = async (id: number, name: string) => {
  if (!confirm(`Er du sikker på at du vil slette "${name}"?`)) {
    return
  }
  try {
    await deleteAllergyType(id)
    showSuccessToast('Allergi slettet', `${name} er fjernet fra kataloget`)
  } catch (error) {
    console.error('🥜 > AdminAllergies > Error deleting:', error)
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
const handleRowClick = (allergyType: AllergyType) => {
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
  return allergyTypeId === selectedAllergyTypeId.value
}

// ROW SELECTION for TanStack Table (only used in single-select mode)
const rowSelection = computed(() => {
  const selection: Record<number, boolean> = {}

  if (!multiselectMode.value && selectedAllergyTypeId.value !== null) {
    // Find the index of the selected allergy
    const index = sortedAllergyTypes.value.findIndex(a => a.id === selectedAllergyTypeId.value)
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
        data-test-id="admin-allergies"
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
                  icon="i-heroicons-document-text"
                  to="/admin/allergies/pdf"
                  target="_blank"
                  name="pdf-poster-button"
              >

                Plakat
              </UButton>
              <FormModeSelector v-model="formMode" @change="onModeChange"/>
            </div>
          </div>
          <AllergyManagersList/>
        </div>
      </template>

      <!-- Desktop: Master-Detail Layout -->
      <div class="hidden md:flex gap-6">
        <!-- MULTISELECT MODE: Use AllergenMultiSelector -->
        <template v-if="multiselectMode">
          <div class="w-full space-y-4">
            <!-- Controls above multiselect -->
            <div class="flex justify-between items-center">
              <UButton
                  color="secondary"
                  variant="outline"
                  @click="toggleMultiselectMode"
                  name="multiselect-toggle"
              >
                <template #leading>
                  <UIcon name="i-heroicons-x-mark"/>
                </template>
                Afslut sammenligning
              </UButton>

              <UButton
                  @click="toggleSortOrder"
                  variant="outline"
                  name="sort-by-count"
                  color="secondary"
              >
                <template #leading>
                  <UIcon
                      :name="isSorted === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-down-wide-narrow'"
                  />
                </template>
                {{ isSorted === 'asc' ? 'Stigende' : 'Faldende' }}
              </UButton>
            </div>

            <!-- AllergenMultiSelector component -->
            <AllergenMultiSelector
                v-model="selectedAllergyIds"
                :allergy-types="sortedAllergyTypes"
                mode="edit"
                :show-statistics="true"
                :show-new-badge="true"
            />
          </div>
        </template>

        <!-- SINGLE-SELECT MODE: Original table + detail panel -->
        <template v-else>
          <!-- MASTER PANEL (Left) -->
          <div class="w-1/3">
            <UTable
                :columns="columns"
                :data="sortedAllergyTypes"
                :loading="isAllergyTypesLoading"
                v-model:row-selection="rowSelection"
                :ui="{ td: 'py-3' }"
            >
              <template #icon-header>
                <UButton
                    v-if="formMode === FORM_MODES.VIEW"
                    color="secondary"
                    variant="outline"
                    @click="toggleMultiselectMode"
                    name="multiselect-toggle"
                    size="lg"
                >
                  <template #leading>
                    <UIcon name="i-heroicons-rectangle-stack"/>
                  </template>
                  Sammenlign
                </UButton>
              </template>

              <!-- Custom header for count column with sort icon -->
              <template #count-header>
                <UButton
                    @click="toggleSortOrder"
                    variant="outline"
                    size="lg"
                    name="sort-by-count"
                    color="secondary"
                >
                  <template #leading>
                    <UIcon
                        :name="isSorted === 'asc' ?'i-lucide-arrow-up-narrow-wide'
                          : 'i-lucide-arrow-down-wide-narrow'"
                        color="neutral"
                    />
                  </template>
                  Antal
                </UButton>
              </template>

              <!-- Icon cell -->
              <template #icon-cell="{ row }">
                <div
                    @click="handleRowClick(row.original)"
                    :class="[
                    'flex items-center justify-center p-2 rounded-lg transition-colors',
                    COMPONENTS.table.clickableCell,
                    isRowSelected(row.original.id!) && COMPONENTS.table.selectedRow
                  ]"
                >
                  <div class="flex items-center justify-center w-10 h-10 rounded-full ring-1 md:ring-2 ring-red-700">
                    <UIcon
                        v-if="row.original.icon?.startsWith('i-')"
                        :name="row.original.icon"
                        class="text-xl"
                    />
                    <span v-else class="text-xl">
                    {{ row.original.icon || '🏷️' }}
                  </span>
                  </div>
                </div>
              </template>

              <!-- Name cell -->
              <template #name-cell="{ row }">
                <div
                    @click="handleRowClick(row.original)"
                    :class="['font-medium', COMPONENTS.table.clickableCell]"
                >
                  {{ row.original.name }}
                </div>
              </template>

              <!-- Count cell -->
              <template #count-cell="{ row }">
                <div
                    @click="handleRowClick(row.original)"
                    :class="['text-center', COMPONENTS.table.clickableCell]"
                >
                  {{ row.original.inhabitants?.length || 0 }}
                </div>
              </template>

              <!-- New badge cell -->
              <template #new-cell="{ row }">
                <div
                    @click="handleRowClick(row.original)"
                    :class="['text-center', COMPONENTS.table.clickableCell]"
                >
                  <span v-if="isNew(row.original.createdAt || '')">🆕</span>
                </div>
              </template>

              <!-- Empty state -->
              <template #empty-state>
                <UAlert
                    variant="soft"
                    :color="COLOR.success"
                    :avatar="{ text: catalogEmptyState.emoji, size: SIZES.emptyStateAvatar.value }"
                    :ui="COMPONENTS.emptyStateAlert"
                >
                  <template #title>
                    {{ catalogEmptyState.text }}
                  </template>
                  <template #description>
                    {{ catalogEmptyState.description }}
                  </template>
                </UAlert>
              </template>
            </UTable>
          </div>

          <!-- DETAIL PANEL (Right) -->
          <div class="flex-1 border-l pl-6">
            <!-- No selection state -->
            <div v-if="!selectedAllergyType && formMode === FORM_MODES.VIEW"
                 class="flex flex-col items-center justify-center py-12 text-gray-500">
              <UIcon name="i-heroicons-arrow-left" class="w-8 h-8 mb-2"/>
              <p class="text-sm">Vælg en allergi for at se detaljer</p>
            </div>

            <!-- Selected allergy in view mode -->
            <div v-else-if="selectedAllergyType && formMode === FORM_MODES.VIEW" class="space-y-4">
              <h3 class="text-lg font-semibold">Detaljer</h3>
              <AllergyTypeCard :allergy-type="selectedAllergyType"/>
            </div>

            <!-- Edit mode -->
            <div v-else-if="formMode === FORM_MODES.EDIT && selectedAllergyType">
              <AllergyTypeCard
                  :allergy-type="selectedAllergyType"
                  mode="edit"
                  @save="handleSubmit"
                  @cancel="cancelEdit"
              />
            </div>

            <!-- Create mode -->
            <div v-else-if="formMode === FORM_MODES.CREATE">
              <h3 class="text-lg font-semibold mb-4">Opret ny allergi</h3>
              <div class="space-y-4">
                <UFormField label="Navn" required>
                  <UInput
                      v-model="formData.name"
                      placeholder="F.eks. Jordnødder"
                      name="allergy-name"
                  />
                </UFormField>

                <UFormField label="Ikon (emoji)">
                  <UInput
                      v-model="formData.icon"
                      placeholder="F.eks. 🥜"
                      name="allergy-icon"
                  />
                </UFormField>

                <UFormField label="Beskrivelse" required>
                  <UTextarea
                      v-model="formData.description"
                      placeholder="Beskriv allergien..."
                      name="allergy-description"
                      :rows="3"
                  />
                </UFormField>

                <div class="flex gap-2">
                  <UButton
                      color="primary"
                      @click="handleSubmit"
                      :disabled="!formData.name || !formData.description"
                      name="submit-allergy-type"
                  >
                    Opret
                  </UButton>
                  <UButton
                      color="neutral"
                      variant="outline"
                      @click="cancelEdit"
                      name="cancel-allergy-type"
                  >
                    Annuller
                  </UButton>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Mobile: Card View -->
      <div class="md:hidden">
        <Loader v-if="isAllergyTypesLoading" text="Indlæser allergier..."/>

        <!-- Empty state -->
        <UAlert
          v-else-if="isNoAllergyTypes"
          variant="soft"
          :color="COLOR.success"
          :avatar="{ text: catalogEmptyState.emoji, size: SIZES.emptyStateAvatar.value }"
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
              v-if="formMode === FORM_MODES.VIEW"
              icon="i-heroicons-plus-circle"
              :color="COLOR.primary"
              @click="startCreate"
              name="create-first-allergy-type"
            >
              Tilføj allergi
            </UButton>
          </template>
        </UAlert>

        <!-- Cards -->
        <div v-else class="space-y-3">
          <UCard
              v-for="allergyType in allergyTypes"
              :key="allergyType.id"
              :ui="{ body: { padding: 'p-4 sm:p-4' } }"
          >
            <div class="flex items-start gap-3">
              <!-- Icon -->
              <div
                  class="flex items-center justify-center w-10 h-10 rounded-full ring-1 md:ring-2 ring-red-700 flex-shrink-0">
                <UIcon
                    v-if="allergyType.icon?.startsWith('i-')"
                    :name="allergyType.icon"
                    class="text-xl"
                />
                <span v-else class="text-xl">
                  {{ allergyType.icon || '🏷️' }}
                </span>
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0 space-y-2">
                <h4 class="font-medium text-sm">{{ allergyType.name }}</h4>
                <p class="text-xs text-gray-600 dark:text-gray-400">
                  {{ allergyType.description }}
                </p>
                <UserListItem
                    v-if="allergyType.inhabitants"
                    :inhabitants="allergyType.inhabitants"
                />
              </div>

              <!-- Actions -->
              <div class="flex gap-2 flex-shrink-0">
                <UButton
                    icon="i-heroicons-pencil"
                    size="xs"
                    color="primary"
                    variant="ghost"
                    @click="startEdit(allergyType)"
                    :name="`edit-allergy-type-${allergyType.id}`"
                />
                <UButton
                    icon="i-heroicons-trash"
                    size="xs"
                    color="red"
                    variant="ghost"
                    @click="handleDelete(allergyType.id!, allergyType.name)"
                    :name="`delete-allergy-type-${allergyType.id}`"
                />
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </UCard>
  </div>
</template>
