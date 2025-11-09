<!--
┌─────────────────────────────────────────────────────────────┐
│ UCARD                                                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ HEADER                                                  │ │
│ │ Familiens allergier og diætkrav                        │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ BODY                                                    │ │
│ │                                                         │ │
│ │ UTable - Inhabitants with expandable allergy editing  │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ [▼] 👤 Anna Testsen [Barn]   🌾 Gluten, 🥛 Mælk   │ │ │
│ │ │ ────────────────────────────────────────────────── │ │ │
│ │ │  EXPANDED:                                         │ │ │
│ │ │  [Add dropdown]                                    │ │ │
│ │ │  ┌──────────────────────────────────────────────┐  │ │ │
│ │ │  │ 🌾 Gluten  [Comment...✓]         [🗑️]      │  │ │ │
│ │ │  │ 🥛 Mælk    [Comment...✓]         [🗑️]      │  │ │ │
│ │ │  └──────────────────────────────────────────────┘  │ │ │
│ │ ├─────────────────────────────────────────────────────┤ │ │
│ │ │ [▶] 👤 Bob Testsen           ☀️ Ingen allergier   │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ │                                                         │ │
│ │ 💜 UAlert - Contact allergi ansvarlig (always shown)  │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
-->

<script setup lang="ts">
import {h, resolveComponent} from 'vue'
import {calculateAge} from '~/utils/date'
import type {HouseholdWithInhabitants} from '~/composables/useHouseholdValidation'

interface Props {
  household: HouseholdWithInhabitants
}

const props = defineProps<Props>()

const UButton = resolveComponent('UButton')

const householdStore = useHouseholdsStore()

const allergyStore = useAllergiesStore()
const {
  allergyTypes,
  allergies,
  isAllergyTypesLoading,
  isAllergyTypesInitialized,
  isAllergiesLoading
} = storeToRefs(allergyStore)
const {loadAllergiesForHousehold} = allergyStore

// Load allergies for this household
loadAllergiesForHousehold(props.household.id)

// Expandable row state - only one at a time
const expanded = ref<Record<number, boolean>>({})

// Toast notifications
const toast = useToast()
const showSuccessToast = (title: string, description?: string) => {
  toast.add({ title, description, color: 'success' })
}

// Single edit form state
const editingInhabitantId = ref<number | null>(null)
const selectedAllergyIds = ref<number[]>([])
const allergyComments = ref<Record<number, string>>({})

// Initialize form when expanding a row
const onRowExpand = (inhabitantId: number, allergies: any[]) => {
  editingInhabitantId.value = inhabitantId
  selectedAllergyIds.value = allergies.map(a => a.allergyType.id)
  allergyComments.value = allergies.reduce((acc, a) => {
    acc[a.allergyType.id] = a.inhabitantComment || ''
    return acc
  }, {} as Record<number, string>)
}

// Clear form
const clearForm = () => {
  editingInhabitantId.value = null
  selectedAllergyIds.value = []
  allergyComments.value = {}
}

// Add allergy type to inhabitant
const handleAddAllergy = async (allergyTypeId: number) => {
  if (!editingInhabitantId.value) return

  await allergyStore.createAllergy({
    inhabitantId: editingInhabitantId.value,
    allergyTypeId: allergyTypeId,
    inhabitantComment: null
  })

  showSuccessToast('Allergi tilføjet')
}

// Delete allergy
const handleDeleteAllergy = async (allergyId: number) => {
  await allergyStore.deleteAllergy(allergyId)

  showSuccessToast('Allergi fjernet')
}

// Get current allergies for editing inhabitant (reactive - updates from allergy store)
const currentAllergies = computed(() => {
  const inhabitant = tableData.value.find(i => i.id === editingInhabitantId.value)
  return inhabitant?.allergies || []
})

// Get available allergy types (not already assigned to this inhabitant)
const availableAllergyTypes = computed(() => {
  const assignedTypeIds = currentAllergies.value.map(a => a.allergyType.id)
  return allergyTypes.value.filter(type => !assignedTypeIds.includes(type.id))
})

// IMMEDIATE SAVE: Update allergy comment
const handleCommentUpdate = async (allergyTypeId: number) => {
  if (!editingInhabitantId.value) return

  const inhabitant = tableData.value.find(i => i.id === editingInhabitantId.value)
  if (!inhabitant) return

  const allergy = inhabitant.allergies.find(a => a.allergyType.id === allergyTypeId)
  if (!allergy) return

  const comment = allergyComments.value[allergyTypeId] || ''

  await allergyStore.updateAllergy(allergy.id, {
    id: allergy.id,
    inhabitantComment: comment || null
  })

  showSuccessToast('Kommentar gemt')
}

// Prepare table data - join inhabitants with allergies from allergy store
const tableData = computed(() => {
  if (!props.household?.inhabitants) return []

  return props.household.inhabitants.map(inhabitant => {
    const age = calculateAge(inhabitant.birthDate)
    const isChild = age !== null && age < 18

    // Get allergies for this inhabitant from allergy store
    const inhabitantAllergies = allergies.value.filter(a => a.inhabitantId === inhabitant.id)

    return {
      id: inhabitant.id,
      heynaboId: inhabitant.heynaboId,
      name: inhabitant.name,
      lastName: inhabitant.lastName,
      pictureUrl: inhabitant.pictureUrl,
      birthDate: inhabitant.birthDate,
      isChild,
      allergies: inhabitantAllergies
    }
  })
})

// Watch for row expansion to initialize form and enforce single expansion
watch(expanded, (newExpanded, oldExpanded) => {
  // Find which row was just expanded
  const expandedKeys = Object.keys(newExpanded).filter(key => newExpanded[Number(key)])

  if (expandedKeys.length > 1) {
    // More than one row expanded - close all except the most recently opened
    const newlyExpandedKey = expandedKeys.find(key => !oldExpanded[Number(key)])
    if (newlyExpandedKey) {
      // Close all others
      Object.keys(expanded.value).forEach(key => {
        if (key !== newlyExpandedKey) {
          expanded.value[Number(key)] = false
        }
      })

      // Initialize form for the newly expanded row
      const rowIndex = Number(newlyExpandedKey)
      const inhabitant = tableData.value[rowIndex]
      if (inhabitant) {
        onRowExpand(inhabitant.id, inhabitant.allergies)
      }
    }
  } else if (expandedKeys.length === 1) {
    // Exactly one row expanded - initialize form
    const rowIndex = Number(expandedKeys[0])
    const inhabitant = tableData.value[rowIndex]
    if (inhabitant) {
      onRowExpand(inhabitant.id, inhabitant.allergies)
    }
  } else {
    // No rows expanded - clear form
    clearForm()
  }
})

// Table columns
const columns = [
  {
    id: 'expand',
    cell: ({row}: any) =>
        h(UButton, {
          color: 'neutral',
          variant: 'ghost',
          icon: row.getIsExpanded() ? 'i-heroicons-chevron-down' : 'i-heroicons-pencil',
          square: true,
          'aria-label': row.getIsExpanded() ? 'Luk' : 'Rediger allergier',
          ui: {
            leadingIcon: [
              'text-sm md:text-base',
              'transition-transform',
              row.getIsExpanded() ? 'duration-200 rotate-180' : ''
            ]
          },
          onClick: () => row.toggleExpanded()
        })
  },
  {
    accessorKey: 'name',
    header: 'Beboer'
  },
  {
    id: 'allergies',
    header: 'Allergier',
    cell: () => '' // Custom rendering via #allergies-data template slot
  }
]
</script>

<template>
  <UCard data-test-id="household-allergies" class="rounded-none md:rounded-lg border-t-0 md:border-t" :ui="{ body: 'px-0 mb-0 md:px-4' }">
    <!-- HEADER -->
    <template #header>
      <h3 class="text-lg font-semibold">Familiens allergier og diætkrav</h3>
    </template>

    <!-- BODY -->
    <div class="space-y-2 md:space-y-4">
      <template v-if="household">
        <!-- Inhabitants table with expandable allergy editing -->
        <UTable
            v-model:expanded="expanded"
            :data="tableData"
            :columns="columns"
            :ui="{ tr: 'data-[expanded=true]:bg-elevated/50', th: 'px-1 py-1 md:px-4 md:py-3', td: 'px-1 md:px-4' }"
        >
          <!-- Inhabitant column -->
          <template #name-cell="{ row }">
            <UserListItem
                :to-display="row.original"
                compact
            />
          </template>

          <!-- Allergies column (collapsed state) -->
          <template #allergies-cell="{ row }">
            <AllergyTypeDisplay v-if="row.original.allergies.length === 0" compact show-name />
            <div v-else class="flex flex-wrap gap-1 md:gap-2">
              <div
                  v-for="allergy in row.original.allergies"
                  :key="allergy.id"
                  class="flex items-center gap-1"
              >
                <AllergyTypeDisplay :allergy-type="allergy.allergyType" compact show-name />
                <span v-if="allergy.inhabitantComment" class="text-xs text-muted">
                  ({{ allergy.inhabitantComment }})
                </span>
              </div>
            </div>
          </template>

          <!-- Expanded row: Allergy edit form -->
          <template #expanded="{ row }">
            <Loader v-if="isAllergyTypesLoading" text="Indlæser allergi typer..."/>
            <div v-else class="p-4 space-y-4">
              <!-- Add new allergy selector -->
              <UFormField
                  v-if="availableAllergyTypes.length > 0"
                  label="Tilføj allergi"
                  description="Vælg en allergi fra listen"
              >
                <USelectMenu
                    :model-value="null"
                    :items="availableAllergyTypes"
                    placeholder="🥛🥐🥚🥜 vælg en allergi..."
                    value-key="id"
                    @update:model-value="handleAddAllergy"
                >
                  <template #item="{ item }">
                    <span class="flex items-center gap-2">
                      <span>{{ item.icon }}</span>
                      <span>{{ item.name }}</span>
                    </span>
                  </template>
                  <template #item-empty>
                    <span class="text-muted">Ingen allergier tilgængelige</span>
                  </template>
                </USelectMenu>
              </UFormField>

              <!-- List of current allergies (reactive - uses currentAllergies computed) -->
              <div v-if="currentAllergies.length > 0" class="space-y-3">
                <label class="block text-sm font-medium mb-2">Allergier</label>
                <div
                    v-for="allergy in currentAllergies"
                    :key="allergy.id"
                    class="flex flex-col items-start md:flex-row md:items-center gap-3 p-3 rounded-lg border border-default bg-elevated"
                >
                  <!-- Icon and name row -->
                  <div class="flex items-center gap-2 md:flex-shrink-0">
                    <AllergyTypeDisplay :allergy-type="allergy.allergyType" show-name />
                  </div>

                  <!-- Comment input row -->
                  <div class="flex items-center gap-2 flex-1">
                    <div class="flex-1">
                      <UFormField :label="`Kommentar til ${allergy.allergyType.name}`" class="mb-0">
                        <UInput
                            v-model="allergyComments[allergy.allergyType.id]"
                            placeholder="Tilføj en kommentar..."
                            size="sm"
                            :ui="{ trailing: 'flex justify-end' }"
                            @keyup.enter="handleCommentUpdate(allergy.allergyType.id)"
                        >
                          <template #trailing>
                            <UButton
                                color="success"
                                variant="solid"
                                icon="i-heroicons-check"
                                size="xs"
                                :padded="false"
                                @click="handleCommentUpdate(allergy.allergyType.id)"
                                aria-label="Gem kommentar"
                            />
                          </template>
                        </UInput>
                      </UFormField>
                    </div>
                    <UButton
                        color="error"
                        variant="solid"
                        icon="i-heroicons-trash"
                        size="sm"
                        square
                        @click="handleDeleteAllergy(allergy.id)"
                        aria-label="Slet allergi"
                    />
                  </div>
                </div>
              </div>

              <!-- Empty state -->
              <AllergyTypeDisplay show-name />
            </div>
          </template>
        </UTable>

        <!-- Contact allergi ansvarlig (always shown) -->
        <AllergyManagersList/>

        <!-- MOCKUP: AllergyTypeDisplay Component Variations -->
        <UCard class="rounded-none md:rounded-lg border-t-0 md:border-t">
          <template #header>
            <h4 class="text-base font-semibold">🎨 AllergyTypeDisplay Component Mockup</h4>
          </template>
          <div class="space-y-6">
            <!-- Sample allergy types for testing -->
            <div class="space-y-4">
              <div class="space-y-2">
                <h5 class="text-sm font-semibold text-muted">1. Compact without name (compact)</h5>
                <div class="flex gap-2 items-center p-2 bg-elevated rounded">
                  <AllergyTypeDisplay :allergy-type="{ name: 'Gluten', icon: '🌾' }" compact />
                  <AllergyTypeDisplay :allergy-type="{ name: 'Mælk', icon: '🥛' }" compact />
                  <AllergyTypeDisplay :allergy-type="{ name: 'Nødder', icon: '🥜' }" compact />
                  <AllergyTypeDisplay compact />
                </div>
              </div>

              <div class="space-y-2">
                <h5 class="text-sm font-semibold text-muted">2. Compact with name (compact + show-name)</h5>
                <div class="flex gap-2 items-center p-2 bg-elevated rounded">
                  <AllergyTypeDisplay :allergy-type="{ name: 'Gluten', icon: '🌾' }" compact show-name />
                  <AllergyTypeDisplay :allergy-type="{ name: 'Mælk', icon: '🥛' }" compact show-name />
                  <AllergyTypeDisplay :allergy-type="{ name: 'Nødder', icon: '🥜' }" compact show-name />
                  <AllergyTypeDisplay compact show-name />
                </div>
              </div>

              <div class="space-y-2">
                <h5 class="text-sm font-semibold text-muted">3. Regular without name</h5>
                <div class="flex flex-col gap-2 p-2 bg-elevated rounded">
                  <AllergyTypeDisplay :allergy-type="{ name: 'Gluten', icon: '🌾' }" />
                  <AllergyTypeDisplay :allergy-type="{ name: 'Mælk', icon: '🥛' }" />
                  <AllergyTypeDisplay :allergy-type="{ name: 'Nødder', icon: '🥜' }" />
                  <AllergyTypeDisplay />
                </div>
              </div>

              <div class="space-y-2">
                <h5 class="text-sm font-semibold text-muted">4. Regular with name (show-name)</h5>
                <div class="flex flex-col gap-2 p-2 bg-elevated rounded">
                  <AllergyTypeDisplay :allergy-type="{ name: 'Gluten', icon: '🌾' }" show-name />
                  <AllergyTypeDisplay :allergy-type="{ name: 'Mælk', icon: '🥛' }" show-name />
                  <AllergyTypeDisplay :allergy-type="{ name: 'Nødder', icon: '🥜' }" show-name />
                  <AllergyTypeDisplay show-name />
                </div>
              </div>

              <div class="space-y-2">
                <h5 class="text-sm font-semibold text-muted">5. With iconify class (i-mdi-food-allergy-off-outline)</h5>
                <div class="flex gap-2 items-center p-2 bg-elevated rounded">
                  <AllergyTypeDisplay :allergy-type="{ name: 'Allergi', icon: 'i-mdi-food-allergy-off-outline' }" compact show-name />
                  <AllergyTypeDisplay :allergy-type="{ name: 'Allergi', icon: 'i-mdi-food-allergy-off-outline' }" show-name />
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </template>
    </div>
  </UCard>
</template>
