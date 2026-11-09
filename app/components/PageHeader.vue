<script setup lang="ts">
import type {NavigationMenuItem} from '@nuxt/ui'
import {BUTTON_WORDS} from '~/config/buttonWords'

/**
 * PageHeader - the main navigation
 *
 * - Signed in: the links to the dinners, the household and the team, icons only on a phone; the admin link and the
 *   person's own link in the drawer. From md the areas sit in the centre with their names, the person's links on the right
 * - Signed out: the sign-in link alone
 * - The link of the current route reads active
 * - The menus take their places by CSS breakpoint, so the server render stands as the browser shows it
 * - The drawer closes once the window is md or wider
 *
 * Visual check: any page signed in and signed out, phone and desktop: the sticky bar with the logo, the links with their
 * labels from md, the burger and its drawer on a phone, the active link; the first paint on a desktop shows the desktop
 * arrangement; a drawer opened at phone width closes once the window is md or wider, and the page scrolls again.
 */

type NavItem = NavigationMenuItem & { active: boolean }

const route = useRoute()
const {loggedIn, greeting, avatar} = storeToRefs(useAuthStore())
const {myHousehold} = storeToRefs(useHouseholdsStore())
const {ICONS, NAVIGATION, COMPONENTS, ORIENTATIONS, breakpoint} = useTheSlopeDesignSystem()

const isMenuOpen = ref(false)
// From md the drawer is hidden by CSS; left open, it would keep the page's scroll lock and focus trap
watch(breakpoint.isMd, isMd => {
  if (isMd) isMenuOpen.value = false
})

const isActive = (to: string): boolean => route.path.startsWith(to)

const areaLinks = computed((): NavItem[] => loggedIn.value ? [
  {
    label: 'Fællesspisning',
    to: '/dinner',
    icon: ICONS.dinner,
    active: isActive('/dinner')
  },
  {
    label: 'Husstand',
    to: myHousehold.value
        ? getHouseholdUrl(myHousehold.value.shortName, myHousehold.value.pbsId, HOUSEHOLD_TAB.bookings)
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
] : [])

const personLinks = computed((): NavItem[] => loggedIn.value ? [
  {label: 'Admin', to: '/admin', icon: ICONS.admin, active: isActive('/admin')},
  {label: greeting.value, to: '/login', avatar: {src: avatar.value ?? undefined, icon: ICONS.user}, active: isActive('/login')}
] : [])

const signInLinks = computed((): NavItem[] => [{
  label: 'LOGIN',
  to: '/login',
  icon: ICONS.login,
  active: isActive('/login')
}])
</script>

<template>
  <UHeader
      v-model:open="isMenuOpen"
      title="Skråningen"
      :toggle="NAVIGATION.toggle(isMenuOpen)"
      :ui="COMPONENTS.pageHeader.ui"
  >
    <template #title>
      <Logo/>
    </template>
    <template #right>
      <template v-if="loggedIn">
        <UNavigationMenu
            :items="areaLinks"
            :orientation="ORIENTATIONS.horizontal"
            :class="COMPONENTS.pageHeader.areaIcons"
            :ui="COMPONENTS.pageHeader.mainMenuUi"
        />
        <UNavigationMenu
            :items="personLinks"
            :orientation="ORIENTATIONS.horizontal"
            :class="COMPONENTS.pageHeader.personLinks"
            :ui="COMPONENTS.pageHeader.mainMenuUi"
        />
      </template>
      <UNavigationMenu
          v-else
          :items="signInLinks"
          :orientation="ORIENTATIONS.horizontal"
          :ui="COMPONENTS.pageHeader.mainMenuUi"
      />
      <HelpButton/>
    </template>

    <!-- UHeader's centre, shown from md -->
    <UNavigationMenu
        :items="areaLinks"
        :orientation="ORIENTATIONS.horizontal"
    />

    <!-- The drawer the burger opens on a phone -->
    <template #body>
      <UNavigationMenu
          :items="personLinks"
          :orientation="ORIENTATIONS.vertical"
      />
      <HelpButton :label="BUTTON_WORDS.help"/>
    </template>
  </UHeader>
</template>
