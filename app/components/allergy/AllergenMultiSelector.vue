<!--
AllergenMultiSelector - the allergy catalog as a multiselect beside the allergy panel of a dinner's diners

| ☑ (milk)  Mælk & Smør     2,5  |  (allergy) Allergier blandt gæsterne                     |
| ☑ (nuts)  Nødder           1   |  3,5 kuv. | Mælk · 2,5 | Nødder · 1                      |
| ☐ (wheat) Gluten           0   |  [v] Hvem                                                |
|                                |      Dorthe (milk), Skraaningen (milk), Martin (nuts)    |

The count column and the panel read `tickets`: the kuverter of the diners carrying each allergen, and the
overview of the selected allergens in the catalog's order, a zero included. Without tickets the count column
and the panel render nothing. On a phone the panel lands below the catalog and a fixed bar summarises the
selection and jumps to it.

USAGE:

Chef (ChefMenuCard - editing the menu's allergens):
  <AllergenMultiSelector
    v-model="draftAllergenIds"
    :allergy-types="allergyTypes"
    :tickets="dinnerEvent.tickets ?? []"
  />

Allergy Manager (AdminAllergies - compare):
  <AllergenMultiSelector
    v-model="selectedAllergyIds"
    :allergy-types="allergyTypes"
    :show-new-badge="true"
  />
-->
<script setup lang="ts">
import type {AllergyTypeDetail} from '~/composables/useAllergyValidation'
import type {OrderDetail} from '~/composables/useBookingValidation'

interface Props {
  modelValue: number[]               // Selected allergen IDs
  allergyTypes: AllergyTypeDetail[]  // The catalog
  tickets?: OrderDetail[]            // The dinner's diners the counts and the panel read
  showStatistics?: boolean           // Show the allergy panel (default: true)
  showNewBadge?: boolean             // Show "new" column (default: false)
  readonly?: boolean                 // Prevent selection changes
}

const props = withDefaults(defineProps<Props>(), {
  tickets: undefined,
  showStatistics: true,
  showNewBadge: false,
  readonly: false
})

const emit = defineEmits<{
  'update:modelValue': [value: number[]]
}>()

// Design system
const { COLOR, ALERTS, ICONS, BUTTONS, NOISE, COMPONENTS } = useTheSlopeDesignSystem()

const {computeAllergenOverview} = useAllergy()

// Forward the shared table's selection (readonly is enforced inside the table)
const handleSelectionChange = (value: number | number[] | null) => {
  if (Array.isArray(value)) emit('update:modelValue', value)
}

// Scroll target for the mobile summary bar - the allergy panel below the list
const allergyPanel = ref<HTMLElement | null>(null)
const scrollToAllergyPanel = () => allergyPanel.value?.scrollIntoView({behavior: 'smooth', block: 'start'})

const selectedAllergies = computed(() => {
  const selectedIds = new Set(props.modelValue)
  return props.allergyTypes.filter(allergyType => selectedIds.has(allergyType.id))
})

const portionsById = computed(() => props.tickets
  ? new Map(computeAllergenOverview(props.tickets, props.allergyTypes).breakdownByAllergen.map(({id, portions}) => [id, portions]))
  : undefined
)

const guestAllergies = computed(() => props.tickets && selectedAllergies.value.length > 0
  ? computeAllergenOverview(props.tickets, selectedAllergies.value)
  : null
)

const isWhoOpen = ref(false)

// The icon slot grows on top of the kind's ui, so the kind's wrap classes survive
const panelUi = {...ALERTS.legend.ui, icon: COMPONENTS.allergenSelector.panelIcon}
</script>

<template>
  <div :class="[COMPONENTS.allergenSelector.root, guestAllergies && showStatistics && COMPONENTS.allergenSelector.withSummaryBar]">
    <!-- MASTER PANEL (shared catalog table) -->
    <div :class="COMPONENTS.allergenSelector.master">
      <AllergyCatalogTable
          mode="multi"
          :allergy-types="allergyTypes"
          :model-value="modelValue"
          :show-new-badge="showNewBadge"
          :show-count="!!tickets"
          :portions-by-id="portionsById"
          :readonly="readonly"
          @update:model-value="handleSelectionChange"
      />
    </div>

    <!-- Mobile summary - fixed to the viewport bottom (an overflow-clipping card
         ancestor keeps position:sticky from ever pinning); taps jump down to the panel -->
    <UButton
        v-if="showStatistics && guestAllergies"
        data-testid="compare-summary-bar"
        :color="COLOR.neutral"
        :variant="NOISE.medium"
        block
        :trailing-icon="ICONS.chevronDown"
        :class="COMPONENTS.allergenSelector.summaryBar"
        @click="scrollToAllergyPanel"
    >
      🧮 {{ selectedAllergies.length }} valgte · {{ formatPortions(guestAllergies.totalPortions) }} kuv.
    </UButton>

    <!-- DETAIL PANEL (the allergies among this dinner's guests) -->
    <div v-if="showStatistics && tickets" ref="allergyPanel" :class="COMPONENTS.allergenSelector.detail">
      <UAlert
          v-if="guestAllergies"
          v-bind="ALERTS.legend"
          :icon="ICONS.allergy"
          :ui="panelUi"
          title="Allergier blandt gæsterne"
          data-testid="allergy-panel"
      >
        <template #description>
          <div :class="COMPONENTS.allergenSelector.panelBody">
            <AllergyOverviewLine
                data-testid="allergy-panel-overview"
                :total-portions="guestAllergies.totalPortions"
                :allergens="guestAllergies.breakdownByAllergen"
            />
            <UButton
                v-bind="{...BUTTONS.secondaryAction, ...BUTTONS.flipOpen(isWhoOpen)}"
                :color="COLOR.neutral"
                data-testid="allergy-panel-who"
                @click="isWhoOpen = !isWhoOpen"
            >
              Hvem
            </UButton>
            <div v-if="isWhoOpen" data-testid="allergy-panel-names" :class="COMPONENTS.allergenSelector.names">
              <template v-for="(diner, index) in guestAllergies.affectedList" :key="diner.inhabitant.id">
                <span>{{ diner.inhabitant.name }}</span>
                <AllergyChips :allergy-types="diner.matchingAllergens" />
                <span v-if="index < guestAllergies.affectedList.length - 1">, </span>
              </template>
            </div>
          </div>
        </template>
      </UAlert>

      <!-- No selection state -->
      <UAlert
          v-else
          v-bind="ALERTS.emptyStateCompact"
          :icon="ICONS.allergy"
      >
        <template #title>
          Vælg allergener, for at se hvem de påvirker
        </template>
      </UAlert>
    </div>
  </div>
</template>
