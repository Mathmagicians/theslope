<script setup lang="ts">
import type {AllergyType, AllergyTypeCreate, AllergyTypeUpdate} from '~/composables/useAllergyValidation'
import {FORM_MODES} from '~/types/form'

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

// FORM STATE
const formMode = ref<'view' | 'create' | 'edit'>('view')
const editingId = ref<number | null>(null)
const formData = ref<AllergyTypeCreate>({
  name: '',
  description: '',
  icon: undefined
})

// ACTIONS
const startCreate = () => {
  formMode.value = 'create'
  editingId.value = null
  formData.value = {
    name: '',
    description: '',
    icon: undefined
  }
}

const startEdit = (allergyType: AllergyType) => {
  formMode.value = 'edit'
  editingId.value = allergyType.id!
  formData.value = {
    name: allergyType.name,
    description: allergyType.description,
    icon: allergyType.icon
  }
}

const cancelEdit = () => {
  formMode.value = 'view'
  editingId.value = null
  formData.value = {
    name: '',
    description: '',
    icon: undefined
  }
}

const handleSubmit = async () => {
  try {
    if (formMode.value === 'create') {
      await createAllergyType(formData.value)
      showSuccessToast('Allergi oprettet', `${formData.value.name} er tilføjet til kataloget`)
    } else if (formMode.value === 'edit' && editingId.value) {
      await updateAllergyType(editingId.value, formData.value)
      showSuccessToast('Allergi opdateret', `${formData.value.name} er opdateret`)
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

// TABLE COLUMNS
const columns = [
  {
    accessorKey: 'icon',
    header: ''
  },
  {
    accessorKey: 'name',
    header: 'Navn'
  },
  {
    accessorKey: 'description',
    header: 'Beskrivelse'
  },
  {
    accessorKey: 'inhabitants',
    header: 'Beboere'
  },
  {
    accessorKey: 'actions',
    header: ''
  }
]
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
            <UButton
                v-if="formMode === 'view'"
                icon="i-heroicons-plus-circle"
                color="primary"
                @click="startCreate"
                name="create-allergy-type"
            >
              Tilføj allergi
            </UButton>
          </div>
          <AllergyManagersList />
        </div>
      </template>

      <!-- Create/Edit Form -->
      <div v-if="formMode !== 'view'" class="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h3 class="text-md font-semibold mb-4">
          {{ formMode === 'create' ? 'Opret ny allergi' : 'Rediger allergi' }}
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <UFormField label="Beskrivelse" required class="md:col-span-2">
            <UTextarea
                v-model="formData.description"
                placeholder="Beskriv allergien..."
                name="allergy-description"
                :rows="3"
            />
          </UFormField>
        </div>

        <div class="flex gap-2 mt-4">
          <UButton
              color="primary"
              @click="handleSubmit"
              :disabled="!formData.name || !formData.description"
              name="submit-allergy-type"
          >
            {{ formMode === 'create' ? 'Opret' : 'Gem' }}
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

      <!-- Desktop: Table View -->
      <UTable
          :columns="columns"
          :data="allergyTypes"
          :loading="isAllergyTypesLoading"
          :ui="{ td: 'py-3' }"
          class="hidden md:block"
      >
        <!-- Icon cell with red circle -->
        <template #icon-cell="{ row }">
          <div class="relative flex items-center justify-center w-12 h-12">
            <div class="absolute inset-0 rounded-full border-[5px] border-red-700"></div>
            <UIcon
                v-if="row.original.icon?.startsWith('i-')"
                :name="row.original.icon"
                class="relative text-2xl z-10"
            />
            <span v-else class="relative text-2xl z-10">
              {{ row.original.icon || '🏷️' }}
            </span>
          </div>
        </template>

        <!-- Name cell -->
        <template #name-cell="{ row }">
          <div class="font-medium">{{ row.original.name }}</div>
        </template>

        <!-- Description cell -->
        <template #description-cell="{ row }">
          <div class="text-sm text-gray-600 dark:text-gray-400">
            {{ row.original.description }}
          </div>
        </template>

        <!-- Inhabitants cell with avatar group -->
        <template #inhabitants-cell="{ row }">
          <UserListItem
              v-if="row.original.inhabitants"
              :inhabitants="row.original.inhabitants"
          />
        </template>

        <!-- Actions cell -->
        <template #actions-cell="{ row }">
          <div class="flex gap-2 justify-end">
            <UButton
                icon="i-heroicons-pencil"
                size="xs"
                color="primary"
                variant="ghost"
                @click="startEdit(row.original)"
                :name="`edit-allergy-type-${row.original.id}`"
            />
            <UButton
                icon="i-heroicons-trash"
                size="xs"
                color="red"
                variant="ghost"
                @click="handleDelete(row.original.id!, row.original.name)"
                :name="`delete-allergy-type-${row.original.id}`"
            />
          </div>
        </template>

        <!-- Empty state -->
        <template #empty-state>
          <div class="flex flex-col items-center justify-center py-6 gap-3">
            <UIcon name="i-heroicons-clipboard-document-list" class="w-8 h-8 text-gray-400"/>
            <p class="text-sm text-gray-500">
              Ingen allergier i kataloget endnu. Tilføj en allergi for at komme i gang.
            </p>
            <UButton
                v-if="formMode === 'view'"
                icon="i-heroicons-plus-circle"
                color="primary"
                @click="startCreate"
                name="create-first-allergy-type"
            >
              Tilføj allergi
            </UButton>
          </div>
        </template>
      </UTable>

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
              v-if="formMode === 'view'"
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
              <div class="relative flex items-center justify-center w-10 h-10 flex-shrink-0">
                <div class="absolute inset-0 rounded-full border-4 border-red-700"></div>
                <UIcon
                    v-if="allergyType.icon?.startsWith('i-')"
                    :name="allergyType.icon"
                    class="relative text-xl z-10"
                />
                <span v-else class="relative text-xl z-10">
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
