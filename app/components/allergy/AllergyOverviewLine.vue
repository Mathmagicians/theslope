<!--
AllergyOverviewLine - the kuverter of the allergic diners, then each allergen with its kuverter

| (allergy) 3,5 kuv. | Mælk · 2,5 | Nødder · 1 | Gluten · 0 |

The site orders the allergens and sets the type size on the line: the kitchen list (most kuverter first), the chef's
allergen row and the allergen selector's panel (the menu's allergens in their order, a zero included).
-->
<script setup lang="ts">
defineProps<{
  totalPortions: number
  allergens: Array<{name: string, portions: number}>
}>()

const {COMPONENTS, ICONS} = useTheSlopeDesignSystem()
</script>

<template>
  <div :class="COMPONENTS.allergyOverview.line">
    <span :class="COMPONENTS.allergyOverview.total">
      <UIcon :name="ICONS.allergy" :class="COMPONENTS.allergyOverview.glyph" />
      {{ formatPortions(totalPortions) }} kuv.
    </span>
    <span v-for="allergen in allergens" :key="allergen.name" :class="COMPONENTS.allergyOverview.figure">
      | {{ allergen.name }} · {{ formatPortions(allergen.portions) }}
    </span>
  </div>
</template>
