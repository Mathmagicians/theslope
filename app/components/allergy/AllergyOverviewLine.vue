<!--
AllergyOverviewLine - the kuverter of the allergic diners, then each allergen as its compact AllergyTypeDisplay with its kuverter

| (allergy) 3 kuv. | (milk) Mælk · 2 | (nuts) Nødder · 1 | (wheat) Gluten · 0 |

The site orders the allergens and sets the type size on the line: the kitchen list, the chef's allergen row and the
allergen selector's panel (the menu's or the selection's allergens in their order, a zero included). The chef's row
leads with the glyph on its title and sets the line without one (`withGlyph` false).
-->
<script setup lang="ts">
import type {AllergenOverview} from '~/composables/useAllergy'

withDefaults(defineProps<{
  totalPortions: number
  allergens: AllergenOverview['breakdownByAllergen']
  withGlyph?: boolean
}>(), {withGlyph: true})

const {COMPONENTS, ICONS} = useTheSlopeDesignSystem()
</script>

<template>
  <div :class="COMPONENTS.allergyOverview.line">
    <span :class="COMPONENTS.allergyOverview.total">
      <UIcon v-if="withGlyph" :name="ICONS.allergy" :class="COMPONENTS.allergyOverview.glyph" />
      {{ formatPortions(totalPortions) }} kuv.
    </span>
    <span v-for="allergen in allergens" :key="allergen.id" :class="COMPONENTS.allergyOverview.figure">
      | <AllergyTypeDisplay :allergy-type="allergen" compact show-name /> · {{ formatPortions(allergen.portions) }}
    </span>
  </div>
</template>
