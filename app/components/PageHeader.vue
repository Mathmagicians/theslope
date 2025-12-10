<script setup lang="ts">
/**
 * PageHeader - Main navigation header
 *
 * Business Rules:
 * - Non-admin links always visible (icons only on mobile)
 * - Admin link and user menu in burger/drawer
 * - Active state shown for current route
 * - Only login button shown when not logged in
 *
 * ADR Compliance:
 * - Uses design system icons (ICONS)
 * - Responsive with isMd breakpoint
 * - Mobile-first design
 */

const route = useRoute()
const {loggedIn, greeting, avatar} = storeToRefs(useAuthStore())
const {myHousehold} = storeToRefs(useHouseholdsStore())
const {ICONS, NAVIGATION} = useTheSlopeDesignSystem()

// Check if route is active
const isActive = (to: string): boolean => route.path.startsWith(to)

// Main navigation links (always visible when logged in)
const mainLinks = computed(() => loggedIn.value ? [
  {
    label: 'Fællesspisning',
    to: '/dinner',
    icon: ICONS.dinner,
    active: isActive('/dinner')
  },
  {
    label: 'Husstand',
    to: myHousehold.value
        ? `/household/${encodeURIComponent(myHousehold.value.shortName)}/bookings`
        : '/household',
    icon: ICONS.household,
    active: isActive('/household')
  },
  {
    label: 'Madhold',
    to: '/chef',
    icon: ICONS.chef,
    active: isActive('/chef')
  }
] : [{
  label: 'LOGIN',
  to: '/login',
  icon: ICONS.login,
  active: isActive('/login')
}])


// Drawer menu items (admin + user)
const drawerLinks = computed(() => [
  {label: 'Admin', to: '/admin', icon: ICONS.admin, active: isActive('/admin')},
  {label: greeting.value, to: '/login', avatar: {src: avatar.value, icon: ICONS.user}, active: isActive('/login')}
])

// Swap links based on breakpoint: on desktop drawer links go to main nav
const visibleMainLinks = computed(() => {
  if (!loggedIn.value) return mainLinks.value
  return NAVIGATION.shouldSwapDrawerWithMain
    ? drawerLinks.value
    : mainLinks.value
})

const visibleDrawerLinks = computed(() => {
  if (!loggedIn.value) return []
  return NAVIGATION.shouldSwapDrawerWithMain
    ? mainLinks.value
    : drawerLinks.value
})

</script>

<template>
  <div class="sticky top-0 md:top-4 z-30 flex items-center justify-center">
    <UHeader
        :ui="{
          root: 'bg-blue-100 md:bg-blue-100/80 dark:bg-blue-900 md:dark:bg-blue-900/80 shadow-sm md:rounded-lg',
          toggle: 'md:hidden',
          left: 'md:flex-1',
          right: 'flex items-center justify-end md:flex-1 gap-1.5'
        }"
    >
      <template #toggle="{ open, toggle }">
        <UButton
            class="md:hidden"
            :icon="ICONS.menu"
            :color="open ? NAVIGATION.link.activeColor : NAVIGATION.link.color"
            :variant="open ? NAVIGATION.link.activeVariant : NAVIGATION.link.variant"
            @click="toggle"
        />
      </template>
      <template #left>
        <NuxtLink to="/" class="shrink-0 w-16 md:w-32">
          <Logo/>
        </NuxtLink>
      </template>
      <template #right>
        <!-- Main navigation - swaps with drawer on desktop -->
        <UNavigationMenu
            :items="visibleMainLinks"
            orientation="horizontal"
            :ui="{ linkLabel: 'hidden md:inline' }"
        />
        <HelpButton/>
      </template>

      <!-- Default slot - drawer links shown horizontally on desktop -->
      <UNavigationMenu
          :items="visibleDrawerLinks"
          orientation="horizontal"
      />

      <!-- Drawer content - only on mobile -->
      <template #body>
        <UNavigationMenu
            :items="visibleDrawerLinks"
            orientation="vertical"
        />
        <HelpButton/>
      </template>
    </UHeader>
  </div>
</template>
