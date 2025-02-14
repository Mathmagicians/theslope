<script setup lang="ts">
const { loggedIn, greeting } = storeToRefs(useAuthStore())

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

const isMenuOpen = ref(false)

const closeMenu = () => {
  isMenuOpen.value = false
}
</script>

<template>
  <UContainer class="sticky top-0 z-50 w-full bg-blue-100 dark:bg-blue-900">
    <div class="flex items-center justify-between p-2">
      <NuxtLink to="/" class="w-24 md:w-32 shrink-0 md:mr-8">
        <Logo />
      </NuxtLink>

      <UHorizontalNavigation
          :links="navigationLinks"
          class="hidden md:flex"
      />

      <UButton
          variant="ghost"
          @click="isMenuOpen = !isMenuOpen"
          class="md:hidden"
      >
        <Icon
            :name="isMenuOpen ? 'heroicons:x-mark' : 'heroicons:bars-3'"
            class="w-6 h-6"
        />
      </UButton>
    </div>

    <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
    >
      <div v-if="isMenuOpen"
           class="fixed top-0 right-0 w-3/4 h-full bg-blue-100 dark:bg-blue-900 z-50 md:hidden">
        <div class="flex justify-end p-2">
          <UButton variant="ghost" @click="closeMenu">
            <Icon name="i-heroicons-x-mark" class="w-6 h-6"/>
          </UButton>
        </div>
        <div class="flex flex-col items-center pt-10">
          <UVerticalNavigation
              :links="navigationLinks"
              class="text-xl space-y-6"
              @click="closeMenu"
          />
        </div>
      </div>
    </Transition>
  </UContainer>
</template>
