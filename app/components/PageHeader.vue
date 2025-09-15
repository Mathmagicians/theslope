<script setup lang="ts">
const {loggedIn, greeting} = storeToRefs(useAuthStore())

const navigationLinks = computed(() => [
  {
    label: "Fællesspisning",
    to: "/dinner",
    icon: "i-streamline-food-kitchenware-spoon-plate-fork-plate-food-dine-cook-utensils-eat-restaurant-dining"
  },
  {
    label: "Husholdning",
    to: "/household",
    icon: 'i-heroicons-home'
  },
  {
    label: "Chefkok",
    to: "/chef",
    icon: 'i-streamline-food-kitchenware-chef-toque-hat-cook-gear-chef-cooking-nutrition-tools-clothes-hat-clothing-food'
  },
  {
    label: "Admin",
    to: "/admin",
    icon: 'i-pajamas-admin'
  },
  {
    label: loggedIn.value ? greeting.value : 'LOGIN',
    to: "/login",
    icon: loggedIn.value ? 'i-pajamas-user' : 'i-guidance-entry'
  }
])

const loginLink = computed(() => ({
  label: 'LOGIN',
  to: "/login",
  icon: 'i-guidance-entry'
}))

const burgerLink = computed(() => ({
  icon: 'heroicons:bars-3',
  children: navigationLinks.value
}))

</script>

<template>
  <div
      class="sticky top-0 md:top-4 z-30 md:mx-auto w-full md:max-w-max bg-blue-100 md:bg-blue-100/80 dark:bg-blue-900 md:dark:bg-blue-900/80 shadow-sm md:rounded-lg">
    <div class="flex items-center justify-between p-1 lg:p-2">
      <NuxtLink to="/" class="shrink-0 w-24 lg:w-32 shrink-0 md:mr-2 lg:mr-4">
        <Logo/>
      </NuxtLink>
      <!-- Spacer to push navigation to the right -->
      <div class="grow w-2 md:w-8"></div>
      <!-- Desktop Navigation-->
      <UNavigationMenu
          :items="loggedIn ? navigationLinks: [loginLink]"
          class="hidden md:flex "
          orientation="horizontal"
      />
      <!-- Mobile Navigation -->
      <UNavigationMenu
          :items="loggedIn ? [burgerLink]: [loginLink]"
          class="md:hidden w-full items-center"
          orientation="vertical"
          color="primary"
          arrow
      />

    </div>

  </div>
</template>
