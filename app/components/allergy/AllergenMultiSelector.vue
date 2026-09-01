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

// Internal selection state (Set for efficient .has() lookup)
const selectedAllergyIds = ref<Set<number>>(new Set(props.modelValue))

// Sync internal Set with external Array prop
watch(() => props.modelValue, (newVal) => {
  selectedAllergyIds.value = new Set(newVal)
}, { immediate: true })

// Forward the shared table's selection (readonly is enforced inside the table)
const handleSelectionChange = (value: number | number[] | null) => {
  if (Array.isArray(value)) emit('update:modelValue', value)
}

// Scroll target for the mobile summary bar - the statistics panel below the list
const statisticsPanel = ref<HTMLElement | null>(null)
const scrollToStatistics = () => statisticsPanel.value?.scrollIntoView({behavior: 'smooth', block: 'start'})

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

  <!-- EDIT MODE: Master-Detail Layout (responsive); bottom padding keeps the last
       rows clear of the fixed summary bar on mobile -->
  <div v-else class="flex flex-col md:flex-row gap-4 md:gap-6" :class="allergyStatistics ? 'pb-16 md:pb-0' : ''">
    <!-- MASTER PANEL (shared catalog table) -->
    <div class="md:w-1/3">
      <AllergyCatalogTable
          mode="multi"
          :allergy-types="allergyTypes"
          :model-value="modelValue"
          :show-new-badge="showNewBadge"
          :readonly="readonly"
          @update:model-value="handleSelectionChange"
      />
    </div>

    <!-- Mobile summary - fixed to the viewport bottom (an overflow-clipping card
         ancestor keeps position:sticky from ever pinning); taps jump down to 📊 -->
    <UButton
        v-if="showStatistics && allergyStatistics"
        data-testid="compare-summary-bar"
        :color="COLOR.neutral"
        variant="outline"
        block
        :trailing-icon="ICONS.chevronDown"
        class="md:hidden fixed bottom-4 inset-x-4 z-50 bg-elevated shadow-lg"
        @click="scrollToStatistics"
    >
      🧮 {{ selectedAllergies.length }} valgte · {{ allergyStatistics.totalInhabitants }} beboer{{ allergyStatistics.totalInhabitants === 1 ? '' : 'e' }} berørt
    </UButton>

    <!-- DETAIL PANEL (Statistics) -->
    <div v-if="showStatistics" ref="statisticsPanel" class="flex-1 md:border-l md:pl-6">
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
