<script setup lang="ts">
const horizontalLinks = [
  { label: "Skråningen", to: "/", icon: "i-mdi-hand-heart" },
  { label: "Fællesspisning", to: "/dinner", icon: "i-streamline-food-kitchenware-spoon-plate-fork-plate-food-dine-cook-utensils-eat-restaurant-dining" },
  { label: "Husholdning",  icon: 'i-heroicons-home', to: "/household" },
  { label: "Chefkok", to: "/chef", icon: 'i-streamline-food-kitchenware-chef-toque-hat-cook-gear-chef-cooking-nutrition-tools-clothes-hat-clothing-food' },
  { label: "Admin", to: "/admin" },
];
const verticalLinks = [...horizontalLinks];
</script>

<template>
  <UContainer class="sticky w-2/3   flex items-center justify-between
  bg-opacity-40 bg-blue-curacao-100">
    <!-- Logo with navigation to index page, should always be visible -->
    <div class="w-24 p-1 m-1 md:w-32 md:m-4 min-w-1/12">
      <ULink to="/" ><Logo /></ULink>
    </div>
    <!-- hamburger button to show/hide menu on mobile -->
    <UButton @click="toggleMenu()" class="block md:hidden ">
      <Icon :name="isMenuOpen ? 'pajamas:close' : 'pajamas:hamburger'" class="w-4 h-4 mt-1 text-blue-curacao-200"/>
    </UButton>
    <div class="hidden md:flex">
      <UHorizontalNavigation :links="horizontalLinks"/>
    </div>
  </UContainer>

</template>
