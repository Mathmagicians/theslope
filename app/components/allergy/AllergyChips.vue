<!--
AllergyChips - one compact chip per allergy beside a diner's name, the allergen's name in its tooltip and aria-label

| Anna (wheat)(milk) |
-->
<script setup lang="ts">
import type {AllergyTypeDisplay} from '~/composables/useAllergyValidation'

defineProps<{
  allergyTypes: AllergyTypeDisplay[]
}>()

const {COMPONENTS} = useTheSlopeDesignSystem()
</script>

<template>
  <UTooltip v-for="allergyType in allergyTypes" :key="allergyType.id" :text="allergyType.name">
    <AllergyTypeDisplay :allergy-type="allergyType" compact role="img" :aria-label="allergyType.name" :class="COMPONENTS.allergyOverview.chip" />
  </UTooltip>
</template>
