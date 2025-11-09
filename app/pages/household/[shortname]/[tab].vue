<script setup lang="ts">
/**
 * Household Detail Page - Shows household booking interface with tabs
 *
 * URL: /household/[shortname]/[tab]
 * Example: /household/AR_1_st/bookings
 *
 * Displays:
 * - Bookings tab: Calendar + booking management
 * - Allergies tab: Family allergies
 * - Economy tab: Cost breakdown
 * - Members tab: Household members
 * - Settings tab: Settings
 */

// TAB CONFIGURATION
const tabs = [
  {
    key: 'bookings',
    label: 'Tilmeldinger',
    icon: 'i-heroicons-calendar',
    component: 'HouseholdBookings'
  },
  {
    key: 'members',
    label: 'Husstanden',
    icon: 'i-heroicons-users',
    component: 'HouseholdCard'
  },
  {
    key: 'allergies',
    label: 'Allergier',
    icon: 'i-heroicons-exclamation-triangle',
    component: 'HouseholdAllergies'
  },
  {
    key: 'economy',
    label: 'Økonomi',
    icon: 'i-heroicons-currency-dollar',
    component: 'HouseholdEconomy'
  },
  {
    key: 'settings',
    label: 'Indstillinger',
    icon: 'i-heroicons-cog-6-tooth',
    component: 'HouseholdSettings'
  }
]

// Async component mapping
const asyncComponents = Object.fromEntries(
    tabs.map(tab => [
      tab.key,
      defineAsyncComponent(() => import(`~/components/household/${tab.component}.vue`))
    ])
)

const route = useRoute()
// Get shortname from route
const shortname = computed(() => route.params.shortname as string)

// Tab navigation with URL state
const {activeTab} = useTabNavigation({
  tabs: tabs.map(t => t.key),
  basePath: '/household',
  additionalParams: ['shortname']
})

// Tab items for UTabs component
const tabItems = tabs.map(tab => ({
  ...tab,
  value: tab.key
}))

// Initialize stores
const householdStore = useHouseholdsStore()
const {
  selectedHousehold, isSelectedHouseholdErrored, selectedHouseholdError,
  householdsError, isHouseholdsErrored, isHouseholdsStoreReady
} = storeToRefs(householdStore)

const {initHouseholdsStore} = householdStore

initHouseholdsStore(shortname.value)

useHead({
  title: `🏠 ${shortname.value}`,
  meta: [
    {
      name: "Husstand",
      content: `Tilmeldinger for husstanden ${shortname.value}`,
    },
  ],
})
</script>

<template>
  <div>
    <ViewError v-if="isHouseholdsErrored" :error="householdsError?.statusCode"
               :message="`Kunne ikke hente husstande`" :cause="householdsError"/>
    <ViewError v-else-if="isSelectedHouseholdErrored" :error="selectedHouseholdError?.statusCode"
               :message="`Kunne ikke hente data for husstanden ${shortname}`" :cause="selectedHouseholdError"/>
    <Loader v-else-if="!isHouseholdsStoreReady" :text="`Henter husstanden ${shortname}`"/>
    <UCard v-else class="w-full px-0 rounded-none md:rounded-lg" :ui="{ body: 'px-0 md:px-4' }">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-home" class="text-2xl"/>
          <h2 class="text-xl font-semibold">{{ selectedHousehold.name }}</h2>
        </div>
      </template>
      <UTabs
          v-model="activeTab"
          :items="tabItems"
          class="mb-1 md:mb-4 mx-2 md:mx-0"
          :ui="{ label: 'hidden md:inline' }"
          color="primary"
      >
        <template #content="{ item }">
          <component :is="asyncComponents[item.value]" :household="selectedHousehold"/>
        </template>
      </UTabs>
    </UCard>
  </div>
</template>
