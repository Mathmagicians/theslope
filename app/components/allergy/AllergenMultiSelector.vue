<!--
┌─────────────────────────────────────────────────────────────────────────────┐
│ AllergenMultiSelector - Reusable allergen multiselect component            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ EDIT MODE (table + statistics):                                            │
│ ┌─────────────────────────────────────────────────────────────────────────┐│
│ │ MASTER                        │  DETAIL                                 ││
│ │ ┌──────────────────────────┐  │ ┌─────────────────────────────────────┐││
│ │ │ ☑ Icon  Name     Count   │  │ │ 📊 Statistik                        │││
│ │ ├──────────────────────────┤  │ │                                     │││
│ │ │ ☑ 🥛  Mælk       2       │  │ │ Unikke beboere berørt: 3            │││
│ │ │ ☐ 🥜  Jordnødder 2       │  │ │ 👤 Anna, Bob, Clara                 │││
│ │ │ ☑ 🌾  Gluten     1       │  │ │                                     │││
│ │ └──────────────────────────┘  │ │ Fordeling pr. allergen:             │││
│ │                               │ │ 🥛 Mælk: 2                          │││
│ │                               │ │ 🌾 Gluten: 1                        │││
│ │                               │ └─────────────────────────────────────┘││
│ └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│ VIEW MODE (compact):                                                        │
│ ┌─────────────────────────────────────────────────────────────────────────┐│
│ │ 🥛 Mælk   🌾 Gluten   +1                                                ││
│ │ 👤 👤 👤   3 beboere berørt                                             ││
│ └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

USAGE:

Allergy Manager (AdminAllergies):
  <AllergenMultiSelector
    v-model="selectedAllergyIds"
    :allergy-types="allergyTypes"
    mode="edit"
    :show-statistics="true"
    :show-new-badge="true"
  />

Chef (ChefMenuCard - readonly view):
  <AllergenMultiSelector
    :model-value="dinner.allergenIds"
    :allergy-types="allergyTypes"
    mode="view"
    readonly
  />

Chef (ChefMenuCard - editing):
  <AllergenMultiSelector
    v-model="dinner.allergenIds"
    :allergy-types="allergyTypes"
    mode="edit"
    :show-statistics="true"
  />
-->
<script setup lang="ts">
import type {AllergyTypeDetail} from '~/composables/useAllergyValidation'

interface Props {
  modelValue: number[]               // Selected allergen IDs
  allergyTypes: AllergyTypeDetail[]  // Full list with inhabitants
  mode?: 'view' | 'edit'             // View (compact) vs Edit (table)
  showStatistics?: boolean           // Show affected people panel (default: true)
  showNewBadge?: boolean             // Show "new" column (default: false)
  readonly?: boolean                 // Prevent selection changes
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'edit',
  showStatistics: true,
  showNewBadge: false,
  readonly: false
})

const emit = defineEmits<{
  'update:modelValue': [value: number[]]
}>()

// Design system
const { COLOR, SIZES, COMPONENTS, TYPOGRAPHY, ICONS } = useTheSlopeDesignSystem()

// Business logic
const { hasNewAllergyInhabitants } = useAllergy()

// Internal selection state (Set for efficient .has() lookup)
const selectedAllergyIds = ref<Set<number>>(new Set(props.modelValue))

// Sync internal Set with external Array prop
watch(() => props.modelValue, (newVal) => {
  selectedAllergyIds.value = new Set(newVal)
}, { immediate: true })

// Toggle individual allergy selection
const toggleAllergySelection = (allergyId: number) => {
  if (props.readonly) return

  if (selectedAllergyIds.value.has(allergyId)) {
    selectedAllergyIds.value.delete(allergyId)
  } else {
    selectedAllergyIds.value.add(allergyId)
  }

  // Emit as array
  emit('update:modelValue', Array.from(selectedAllergyIds.value))
}

// Computed for selected allergies
const selectedAllergies = computed(() =>
    props.allergyTypes.filter(at => at.id && selectedAllergyIds.value.has(at.id))
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
    uniqueInhabitantsList: Array.from(uniqueInhabitants.values()),
    breakdownByAllergy: selectedAllergies.value.map(allergy => ({
      name: allergy.name,
      icon: allergy.icon,
      count: allergy.inhabitants?.length || 0
    }))
  }
})

// Table columns (dynamic based on showNewBadge)
const columns = computed(() => {
  const baseColumns = [
    {
      accessorKey: 'checkbox',
      header: ''
    },
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
    }
  ]

  if (props.showNewBadge) {
    baseColumns.push({
      accessorKey: 'new',
      header: 'Nyt'
    })
  }

  return baseColumns
})
</script>

<template>
  <!-- VIEW MODE: Compact display -->
  <div v-if="mode === 'view'" class="space-y-2">
    <!-- Has allergens: show title + badges -->
    <template v-if="selectedAllergies.length > 0">
      <h4 :class="TYPOGRAPHY.sectionSubheading">Allergener i menuen</h4>
      <div class="flex flex-wrap gap-2">
        <UBadge
            v-for="allergy in selectedAllergies"
            :key="allergy.id"
            :color="COLOR.error"
            variant="subtle"
            :size="SIZES.standard"
        >
          <span class="mr-1">{{ allergy.icon || '🏷️' }}</span>
          {{ allergy.name }}
        </UBadge>
      </div>

      <!-- Compact statistics -->
      <div v-if="allergyStatistics && showStatistics" class="flex items-center gap-2" :class="TYPOGRAPHY.bodyTextMuted">
        <UserListItem
            :inhabitants="allergyStatistics.uniqueInhabitantsList"
            compact
            label="beboer"
        />
        <span>berørt af allergener</span>
      </div>
    </template>

    <!-- Empty state - subtle, no title -->
    <UAlert
        v-else
        icon="i-mdi-food-allergy-off-outline"
        :ui="COMPONENTS.emptyStateAlertCompact"
        description="Ingen allergener i menuen"
    />
  </div>

  <!-- EDIT MODE: Master-Detail Layout (responsive) -->
  <div v-else class="flex flex-col md:flex-row gap-4 md:gap-6">
    <!-- MASTER PANEL (Table) -->
    <div class="md:w-1/3">
      <UTable
          :columns="columns"
          :data="allergyTypes"
          :ui="{ td: 'py-3' }"
      >
        <!-- Checkbox cell -->
        <template #checkbox-cell="{ row }">
          <div class="flex items-center justify-center">
            <UCheckbox
                :model-value="selectedAllergyIds.has(row.original.id!)"
                :name="`select-allergen-${row.original.id}`"
                :disabled="readonly"
                :color="COLOR.secondary"
                @change="toggleAllergySelection(row.original.id!)"
            />
          </div>
        </template>

        <!-- Icon cell -->
        <template #icon-cell="{ row }">
          <div
              :class="[
                'flex items-center justify-center p-2 rounded-lg transition-colors',
                !readonly && COMPONENTS.table.clickableCell,
                selectedAllergyIds.has(row.original.id!) && COMPONENTS.table.selectedRow
              ]"
              @click="!readonly && toggleAllergySelection(row.original.id!)"
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
              :class="[
                'font-medium',
                !readonly && COMPONENTS.table.clickableCell
              ]"
              @click="!readonly && toggleAllergySelection(row.original.id!)"
          >
            {{ row.original.name }}
          </div>
        </template>

        <!-- Count cell -->
        <template #count-cell="{ row }">
          <div
              :class="[
                'text-center',
                !readonly && COMPONENTS.table.clickableCell
              ]"
              @click="!readonly && toggleAllergySelection(row.original.id!)"
          >
            {{ row.original.inhabitants?.length || 0 }}
          </div>
        </template>

        <!-- New badge cell - checks if any inhabitants have recently updated allergies -->
        <template v-if="showNewBadge" #new-cell="{ row }">
          <div
              :class="[
                'text-center',
                !readonly && COMPONENTS.table.clickableCell
              ]"
              @click="!readonly && toggleAllergySelection(row.original.id!)"
          >
            <UIcon
                v-if="hasNewAllergyInhabitants(row.original)"
                :name="ICONS.new"
                :class="COMPONENTS.rowIconClass"
            />
          </div>
        </template>
      </UTable>
    </div>

    <!-- DETAIL PANEL (Statistics) -->
    <div v-if="showStatistics" class="flex-1 md:border-l md:pl-6">
      <!-- Statistics panel (with selections) -->
      <div v-if="allergyStatistics" class="space-y-4">
        <h3 :class="TYPOGRAPHY.cardTitle">📊 Statistik</h3>

        <UAlert
            title="Unikke beboere berørt"
            description="Disse bofæller kan ikke tåle denne kombination af allergener."
            :color="COLOR.primary"
            :avatar="{text: allergyStatistics.totalInhabitants.toString()}"
        />

        <!-- Show unique inhabitants -->
        <div class="space-y-2">
          <h4 :class="TYPOGRAPHY.sectionSubheading">Berørte beboere</h4>
          <UserListItem
              :inhabitants="allergyStatistics.uniqueInhabitantsList"
              label="beboer"
              label-plural="beboere"
          />
        </div>

        <div class="space-y-2">
          <h4 :class="TYPOGRAPHY.sectionSubheading">Fordeling pr. allergen</h4>
          <div
v-for="item in allergyStatistics.breakdownByAllergy" :key="item.name"
               class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <div class="flex items-center gap-2">
              <span class="text-lg">{{ item.icon || '�️' }}</span>
              <span :class="TYPOGRAPHY.bodyTextSmall">{{ item.name }}</span>
            </div>
            <span :class="TYPOGRAPHY.bodyTextMedium">{{ item.count }}</span>
          </div>
        </div>

        <!-- Show compact selected allergy cards -->
        <div class="space-y-2">
          <h4 :class="TYPOGRAPHY.sectionSubheading">Valgte allergier</h4>
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

      <!-- No selection state -->
      <UAlert
          v-else
          icon="i-mdi-food-allergy-off-outline"
          :ui="COMPONENTS.emptyStateAlertCompact"
      >
        <template #title>
          Vælg allergener, for at se hvem de påvirker
        </template>
      </UAlert>
    </div>
  </div>
</template>
