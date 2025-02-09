<script setup lang="ts">
const {loggedIn} = storeToRefs(useAuthStore())
const {greeting} = storeToRefs(useAuthStore())

const horizontalLinks = [
 { label: "Fællesspisning", to: "/dinner", icon: "i-streamline-food-kitchenware-spoon-plate-fork-plate-food-dine-cook-utensils-eat-restaurant-dining" },
  { label: "Husholdning",  icon: 'i-heroicons-home', to: "/household" },
  { label: "Chefkok", to: "/chef", icon: 'i-streamline-food-kitchenware-chef-toque-hat-cook-gear-chef-cooking-nutrition-tools-clothes-hat-clothing-food' },
  { label: "Admin", to: "/admin", icon: 'pajamas-admin' },
  loggedIn ? { label: greeting, to: "/login", icon: 'pajamas-user' } : { label: 'LOGIN', to: "/login", icon: 'i-guidance-entry' }
]
const verticalLinks = [...horizontalLinks]

const isMenuOpen = ref(false)
const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}
</script>

<template>
  <UContainer
class="sticky w-full flex items-center justify-between bg-blue-100 dark:bg-blue-900">
    <!-- Logo with navigation to index page, should always be visible -->
    <div class="w-24 p-1 m-1 md:w-32 md:m-4 min-w-1/12">
      <ULink to="/" ><Logo /></ULink>
    </div>
    <!-- hamburger button to show/hide menu on mobile -->
    <UButton class="block md:hidden " @click="toggleMenu()">
      <Icon :name="isMenuOpen ? 'pajamas:close' : 'pajamas:hamburger'" class="w-4 h-4 mt-1 text-blue-200"/>
    </UButton>
    <div class="hidden md:flex">
      <UHorizontalNavigation :links="horizontalLinks"/>
    </div>
  </UContainer>

</template>
