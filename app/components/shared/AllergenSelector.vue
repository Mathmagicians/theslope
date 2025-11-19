<!--
AllergenSelector - Extracted from AdminAllergies multiselect pattern (lines 468-513)

USAGE:
  Allergy Manager (AdminAllergies):
    - mode="edit" (always editable)
    - Shows allergens + affected inhabitants
    - Updates inhabitant allergies

  Chef (DinnerMenuHero):
    - mode="edit" (editable)
    - Shows allergens in menu
    - Updates dinner allergens
    - No inhabitant stats (just allergen list)

  View Mode:
    - mode="view" or compact
    - Read-only display
    - Shows selected allergens + stats
-->
<script setup lang="ts">
import type { AllergyTypeDetail } from '~/composables/useAllergyValidation'

// Design system
const { COLOR, SIZES, COMPONENTS } = useTheSlopeDesignSystem()

// Props - Single source of truth via props (like SeasonSelector pattern)
const props = withDefaults(defineProps<{
  modelValue: number[] // Selected allergen IDs
  allergyTypes: AllergyTypeDisplay[] // REQUIRED: Parent passes data from store
  loading?: boolean
  mode?: 'view' | 'edit'
  compact?: boolean // Compact view (no stats)
  showInhabitantStats?: boolean // Show affected users (allergy manager context)
  readonly?: boolean
}>(), {
  loading: false,
  mode: 'view',
  compact: false,
  showInhabitantStats: false,
  readonly: false
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: number[]]
}>()

// Selected allergen IDs (reactive Set for efficient lookup)
const selectedAllergyIds = ref<Set<number>>(new Set(props.modelValue))

// Sync with prop changes
watch(() => props.modelValue, (newValue) => {
  selectedAllergyIds.value = new Set(newValue)
}, { immediate: true })

// Toggle allergen selection
const toggleAllergySelection = (allergyId: number) => {
  if (props.readonly || props.mode === 'view') return

  if (selectedAllergyIds.value.has(allergyId)) {
    selectedAllergyIds.value.delete(allergyId)
  } else {
    selectedAllergyIds.value.add(allergyId)
  }

  // Emit update
  emit('update:modelValue', Array.from(selectedAllergyIds.value))
}

// Selected allergies (with details)
const selectedAllergies = computed(() =>
  props.allergyTypes.filter(at => at.id && selectedAllergyIds.value.has(at.id))
)

// Statistics for selected allergies (allergy manager context)
const allergyStatistics = computed(() => {
  if (!props.showInhabitantStats || selectedAllergies.value.length === 0) return null

  // Get unique inhabitants across all selected allergies
  const uniqueInhabitants = new Map()
  selectedAllergies.value.forEach(allergy => {
    const allergyDetail = allergy as AllergyTypeDetail
    allergyDetail.inhabitants?.forEach(inhabitant => {
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
      count: (allergy as AllergyTypeDetail).inhabitants?.length || 0
    }))
  }
})
</script>

<template>
  <div class="space-y-4">
    <!-- EDIT MODE: Checkbox list -->
    <div v-if="mode === 'edit'" class="space-y-4">
      <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {{ showInhabitantStats ? 'Vælg allergener' : 'Allergener i menuen' }}
      </h3>

      <Loader v-if="loading" text="Indlæser allergener..." />

      <!-- Allergen checkboxes (2-column grid on desktop) -->
      <UFormField v-else name="allergen-selector">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            v-for="allergyType in props.allergyTypes"
            :key="allergyType.id"
            class="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            :class="{
              'bg-gray-50 dark:bg-gray-800': selectedAllergyIds.has(allergyType.id!),
              'opacity-60 cursor-not-allowed': readonly
            }"
          >
            <!-- Icon -->
            <div class="flex items-center justify-center w-8 h-8 flex-shrink-0">
              <UIcon
                v-if="allergyType.icon?.startsWith('i-')"
                :name="allergyType.icon"
                class="text-lg"
              />
              <span v-else class="text-lg">
                {{ allergyType.icon || '🏷️' }}
              </span>
            </div>

            <!-- Checkbox with built-in label -->
            <UCheckbox
              :model-value="selectedAllergyIds.has(allergyType.id!)"
              :label="allergyType.name"
              :name="`allergen-${allergyType.id}`"
              :disabled="readonly"
              color="secondary"
              class="flex-1"
              @update:model-value="() => toggleAllergySelection(allergyType.id!)"
            />
          </div>
        </div>
      </UFormField>

      <!-- Statistics panel (allergy manager context only) -->
      <div v-if="showInhabitantStats && allergyStatistics" class="space-y-4 mt-6">
        <h3 class="text-lg font-semibold">📊 Statistik</h3>

        <UAlert
          title="Unikke beboere berørt"
          description="Disse bofæller kan ikke tåle denne kombination af allergener."
          color="primary"
          :avatar="{ text: allergyStatistics.totalInhabitants.toString() }"
        />

        <!-- Affected inhabitants -->
        <div class="space-y-2">
          <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Berørte beboere</h4>
          <UserListItem
            :inhabitants="allergyStatistics.uniqueInhabitantsList"
            label="beboere berørt af allergener"
          />
        </div>

        <!-- Breakdown by allergen -->
        <div class="space-y-2">
          <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Fordeling pr. allergen</h4>
          <div
            v-for="item in allergyStatistics.breakdownByAllergy"
            :key="item.name"
            class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
          >
            <div class="flex items-center gap-2">
              <span class="text-lg">{{ item.icon || '🏷️' }}</span>
              <span class="text-sm">{{ item.name }}</span>
            </div>
            <span class="text-sm font-medium">{{ item.count }}</span>
          </div>
        </div>

        <!-- Selected allergy cards (compact) -->
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
    </div>

    <!-- VIEW MODE: Compact display -->
    <div v-else class="space-y-3">
      <h3 v-if="!compact" class="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {{ showInhabitantStats ? 'Allergener' : 'Allergener i menuen' }}
      </h3>

      <!-- Empty state -->
      <UAlert
        v-if="selectedAllergies.length === 0"
        color="neutral"
        variant="soft"
        :title="showInhabitantStats ? 'Ingen allergener valgt' : 'Ingen allergener i denne menu'"
        :description="showInhabitantStats ? 'Vælg allergener fra listen' : 'Denne ret indeholder ingen kendte allergener'"
      />

      <!-- Selected allergens (compact badges) -->
      <div v-else class="flex flex-wrap gap-2">
        <UBadge
          v-for="allergy in selectedAllergies"
          :key="allergy.id"
          color="secondary"
          variant="soft"
          size="md"
        >
          <span class="text-base mr-1">{{ allergy.icon || '🏷️' }}</span>
          {{ allergy.name }}
        </UBadge>
      </div>

      <!-- Inhabitant stats (if enabled) -->
      <div v-if="showInhabitantStats && allergyStatistics && allergyStatistics.totalInhabitants > 0" class="mt-3">
        <UserListItem
          :inhabitants="allergyStatistics.uniqueInhabitantsList"
          label="berørt beboer"
          label-plural="berørte beboere"
        />
      </div>
    </div>
  </div>
</template>
