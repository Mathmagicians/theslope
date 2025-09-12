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

const isMenuOpen = ref(false)

const closeMenu = () => {
  isMenuOpen.value = false
}
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
      <!-- Desktop Navigation, menu items not shown when user not logged in -->
      <UNavigationMenu v-if="loggedIn"
                       :items="navigationLinks"
                       class="hidden md:flex "
                       orientation="horizontal"
      />
      <UNavigationMenu v-else
                       :items="[loginLink]"
                       class="hidden md:flex"
                       orientation="horizontal"
      />

      <div v-if="loggedIn">
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
      <div v-else>
        <NuxtLink to="/login" class="md:hidden">
          <UButton
              variant="ghost"
          >
            <Icon
                name="i-guidance-entry"
                class="w-6 h-6"
            />
          </UButton>
        </NuxtLink>
      </div>

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
           class="fixed top-0 right-0 w-3/4 h-full bg-blue-100 dark:bg-gray-900 z-50 md:hidden">
        <div class="flex justify-end p-2">
          <UButton variant="ghost" @click="closeMenu">
            <Icon name="i-heroicons-x-mark" class="w-6 h-6"/>
          </UButton>
        </div>
        <div class="flex flex-col items-center pt-10">
          <UNavigationMenu
              :items="navigationLinks"
              class="text-xl space-y-6"
              @click="closeMenu"
              orientation="vertical"
          />
        </div>
      </div>
    </Transition>
  </div>
</template>
