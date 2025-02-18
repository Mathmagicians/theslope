<script setup lang="ts">


const selectedIndex = ref<number>(1)

const items = [{
  label: 'Kalender',
  icon: 'i-heroicons-calendar',
},
  {
    label: 'Madhold',
    icon: 'i-fluent-mdl2-team-favorite',
  },
  {
    label: 'Chefkokke',
    icon: 'i-streamline-food-kitchenware-chef-toque-hat-cook-gear-chef-cooking-nutrition-tools-clothes-hat-clothing-food',
  }]


</script>

<template>
  <div>
    <UDivider/>
    <p>Selected index: {{ selectedIndex }} </p>
    <FormStepper v-model="selectedIndex" :steps="items"/>
    <UDivider/>
  </div>

</template>
