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
const selectedAllergyIds = ref<Set<number>>(new Set())

// SORT STATE
const isSorted = ref<'asc' | 'desc'>('desc')
const sortedAllergyTypes = computed(() => {
  const sorted = [...allergyTypes.value]
  sorted.sort((a, b) => {
    const countA = a.inhabitants?.length || 0
    const countB = b.inhabitants?.length || 0
    return isSorted.value === 'desc' ? countB - countA : countA - countB
  })

  // Add meta classes for row styling
  return sorted.map(allergy => ({
    ...allergy,
    meta: {
      class: {
        tr: isRowSelected(allergy.id!)
          ? 'border-2 border-secondary-400 dark:border-secondary-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800'
          : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800'
      }
    }
  }))
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
}, { immediate: true })

// Toggle multiselect mode
const toggleMultiselectMode = () => {
  multiselectMode.value = !multiselectMode.value
  if (!multiselectMode.value) {
    selectedAllergyIds.value.clear()
  }
}

// Toggle individual allergy selection
const toggleAllergySelection = (allergyId: number) => {
  if (selectedAllergyIds.value.has(allergyId)) {
    selectedAllergyIds.value.delete(allergyId)
  } else {
    selectedAllergyIds.value.add(allergyId)
  }
}

// Computed for selected allergies
const selectedAllergies = computed(() =>
  allergyTypes.value.filter(at => at.id && selectedAllergyIds.value.has(at.id))
)

// Statistics for selected allergies
const allergyStatistics = computed(() => {
  if (selectedAllergies.value.length === 0) return null

  // Get unique inhabitants across all selected allergies
  const uniqueInhabitants = new Map()
  selectedAllergies.value.forEach(allergy => {
    allergy.inhabitants?.forEach(inhabitant => {
      if (!uniqueInhabitants.has(inhabitant.id)) {
        uniqueInhabitants.set(inhabitant.id, inhabitant)
      }
    })
  })

  return {
    totalInhabitants: uniqueInhabitants.size,
    breakdownByAllergy: selectedAllergies.value.map(allergy => ({
      name: allergy.name,
      icon: allergy.icon,
      count: allergy.inhabitants?.length || 0
    }))
  }
})

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

const handleSubmit = async (data?: {name: string, description: string, icon?: string}) => {
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
  selectedAllergyTypeId.value = allergyType.id || null
  // In EDIT mode, just update selection without changing mode
  // In other modes (CREATE), switch back to VIEW
  if (formMode.value === FORM_MODES.CREATE) {
    onModeChange(FORM_MODES.VIEW)
  }
}

// Helper to check if a row is selected
const isRowSelected = (allergyTypeId: number) => {
  return allergyTypeId === selectedAllergyTypeId.value || (multiselectMode.value && selectedAllergyIds.value.has(allergyTypeId))
}

// TABLE COLUMNS (dynamic based on multiselect mode)
const columns = computed(() => {
  const baseColumns = [
    {
      accessorKey: 'icon',
      header: ''
    },
    {
      accessorKey: 'name',
      header: 'Allergi'
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

  if (multiselectMode.value) {
    return [
      {
        accessorKey: 'checkbox',
        header: ''
      },
      ...baseColumns
    ]
  }

  return baseColumns
})
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
            <FormModeSelector v-model="formMode" @change="onModeChange" />
          </div>
          <AllergyManagersList />
        </div>
      </template>

      <!-- Desktop: Master-Detail Layout -->
      <div class="hidden md:flex gap-6">
        <!-- MASTER PANEL (Left) -->
        <div class="w-1/3 space-y-4">
          <!-- Multiselect Toggle -->
          <div class="px-4">
            <UButton
                :color="multiselectMode ? 'info' : 'secondary'"
                :variant="multiselectMode ? 'solid' : 'outline'"
                size="lg"
                @click="toggleMultiselectMode"
                name="multiselect-toggle"
                class="w-full"
            >
              <template #leading>
                <UIcon  size="xl" :name="multiselectMode ? 'i-heroicons-clipboard-document-check' : 'i-heroicons-rectangle-stack'" />
              </template>
              Sammenlign allergier
            </UButton>
          </div>

          <UTable
              :columns="columns"
              :data="sortedAllergyTypes"
              :loading="isAllergyTypesLoading"
              :ui="{ td: 'py-3' }"
          >
            <!-- Custom header for count column with sort icon -->
            <template #count-header>
              <UButton
                  @click="toggleSortOrder"
                  variant="ghost"
                  size="xl"
                  name="sort-by-count"
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

            <!-- Checkbox cell (multiselect mode) -->
            <template #checkbox-cell="{ row }">
              <div class="flex items-center justify-center">
                <UCheckbox
                    :model-value="selectedAllergyIds.has(row.original.id!)"
                    @change="toggleAllergySelection(row.original.id!)"
                    :name="`select-allergy-${row.original.id}`"
                    color="secondary"
                />
              </div>
            </template>

            <!-- Icon cell -->
            <template #icon-cell="{ row }">
              <div
                  @click="handleRowClick(row.original)"
                  :class="[
                    'flex items-center justify-center p-2 rounded-lg transition-colors',
                    isRowSelected(row.original.id!) ? 'bg-secondary-100 dark:bg-secondary-900' : ''
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
              <div @click="handleRowClick(row.original)" class="font-medium">
                {{ row.original.name }}
              </div>
            </template>

            <!-- Count cell -->
            <template #count-cell="{ row }">
              <div @click="handleRowClick(row.original)" class="text-center">
                {{ row.original.inhabitants?.length || 0 }}
              </div>
            </template>

            <!-- New badge cell -->
            <template #new-cell="{ row }">
              <div @click="handleRowClick(row.original)" class="text-center">
                <span v-if="isNew(row.original.createdAt || '')">🆕</span>
              </div>
            </template>

            <!-- Empty state -->
            <template #empty-state>
              <div class="flex flex-col items-center justify-center py-6 gap-3">
                <UIcon name="i-heroicons-clipboard-document-list" class="w-8 h-8 text-gray-400"/>
                <p class="text-sm text-gray-500">
                  Ingen allergier i kataloget endnu
                </p>
              </div>
            </template>
          </UTable>
        </div>

        <!-- DETAIL PANEL (Right) -->
        <div class="flex-1 border-l pl-6">
          <!-- Statistics panel (multiselect mode with selections) -->
          <div v-if="multiselectMode && allergyStatistics" class="space-y-4">
            <h3 class="text-lg font-semibold">📊 Statistik</h3>

            <div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div class="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {{ allergyStatistics.totalInhabitants }}
              </div>
              <div class="text-sm text-blue-700 dark:text-blue-300">
                Unikke beboere berørt
              </div>
            </div>

            <div class="space-y-2">
              <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Fordeling pr. allergi</h4>
              <div v-for="item in allergyStatistics.breakdownByAllergy" :key="item.name" class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <div class="flex items-center gap-2">
                  <span class="text-lg">{{ item.icon || '🏷️' }}</span>
                  <span class="text-sm">{{ item.name }}</span>
                </div>
                <span class="text-sm font-medium">{{ item.count }}</span>
              </div>
            </div>

            <!-- Show compact selected allergy cards -->
            <div class="space-y-2">
              <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Valgte allergier</h4>
              <div class="space-y-2">
                <AllergyTypeCard
                    v-for="allergy in selectedAllergies"
                    :key="allergy.id"
                    :allergy-type="allergy"
                    compact
                />
              </div>
            </div>
          </div>

          <!-- No selection state (not multiselect or no selections) -->
          <div v-else-if="!selectedAllergyType && formMode === FORM_MODES.VIEW" class="flex flex-col items-center justify-center py-12 text-gray-500">
            <UIcon name="i-heroicons-arrow-left" class="w-8 h-8 mb-2"/>
            <p class="text-sm">{{ multiselectMode ? 'Vælg allergier for at se statistik' : 'Vælg en allergi for at se detaljer' }}</p>
          </div>

          <!-- Selected allergy in view mode (not multiselect) -->
          <div v-else-if="selectedAllergyType && formMode === FORM_MODES.VIEW" class="space-y-4">
            <h3 class="text-lg font-semibold">Detaljer</h3>
            <AllergyTypeCard :allergy-type="selectedAllergyType" />
          </div>

          <!-- Edit mode -->
          <div v-else-if="formMode === FORM_MODES.EDIT && selectedAllergyType" class="space-y-4">
            <div class="flex justify-between items-center">
              <h3 class="text-lg font-semibold">Rediger</h3>
              <div class="flex gap-2">
                <UButton
                    icon="i-heroicons-pencil"
                    size="xs"
                    color="primary"
                    variant="ghost"
                    @click="startEdit(selectedAllergyType)"
                    :name="`edit-selected-allergy-${selectedAllergyType.id}`"
                />
                <UButton
                    icon="i-heroicons-trash"
                    size="xs"
                    color="red"
                    variant="ghost"
                    @click="handleDelete(selectedAllergyType.id!, selectedAllergyType.name)"
                    :name="`delete-selected-allergy-${selectedAllergyType.id}`"
                />
              </div>
            </div>
            <AllergyTypeCard :allergy-type="selectedAllergyType" />
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
      </div>

      <!-- Mobile: Card View -->
      <div class="md:hidden">
        <Loader v-if="isAllergyTypesLoading" text="Indlæser allergier..." />

        <!-- Empty state -->
        <div v-else-if="isNoAllergyTypes" class="flex flex-col items-center justify-center py-6 gap-3">
          <UIcon name="i-heroicons-clipboard-document-list" class="w-8 h-8 text-gray-400"/>
          <p class="text-sm text-gray-500 text-center">
            Ingen allergier i kataloget endnu. Tilføj en allergi for at komme i gang.
          </p>
          <UButton
              v-if="formMode === FORM_MODES.VIEW"
              icon="i-heroicons-plus-circle"
              color="primary"
              @click="startCreate"
              name="create-first-allergy-type"
          >
            Tilføj allergi
          </UButton>
        </div>

        <!-- Cards -->
        <div v-else class="space-y-3">
          <UCard
              v-for="allergyType in allergyTypes"
              :key="allergyType.id"
              :ui="{ body: { padding: 'p-4 sm:p-4' } }"
          >
            <div class="flex items-start gap-3">
              <!-- Icon -->
              <div class="flex items-center justify-center w-10 h-10 rounded-full ring-1 md:ring-2 ring-red-700 flex-shrink-0">
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
