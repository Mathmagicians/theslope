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
    label: 'Præferencer',
    icon: 'i-heroicons-adjustments-horizontal',
    component: 'HouseholdCard'
  },
  {
    key: 'allergies',
    label: 'Allergier',
    icon: 'i-mdi-food-allergy-off-outline',
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

// Access control: check if current user is member of this household
const authStore = useAuthStore()
const canEdit = computed(() =>
  selectedHousehold.value ? authStore.isMemberOfHousehold(selectedHousehold.value.id) : false
)

// Format household title: address + family name
const { formatHouseholdFamilyName } = useHousehold()
const { TYPOGRAPHY } = useTheSlopeDesignSystem()
const householdAddress = computed(() => selectedHousehold.value?.address ?? '')
const householdFamilyName = computed(() =>
  selectedHousehold.value?.inhabitants
    ? formatHouseholdFamilyName(selectedHousehold.value.inhabitants)
    : null
)

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
    <ViewError
v-if="isHouseholdsErrored" :error="householdsError?.statusCode"
               :message="`Kunne ikke hente husstande`" :cause="householdsError"/>
    <ViewError
v-else-if="isSelectedHouseholdErrored" :error="selectedHouseholdError?.statusCode"
               :message="`Kunne ikke hente data for husstanden ${shortname}`" :cause="selectedHouseholdError"/>
    <Loader v-else-if="!isHouseholdsStoreReady" :text="`Henter husstanden ${shortname}`"/>
    <UCard v-else class="w-full px-0 rounded-none md:rounded-lg" :ui="{ body: 'px-0 py-2 md:px-4 md:py-6' }">
      <template #header>
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-1 md:gap-2">
            <UIcon name="i-heroicons-home" class="text-2xl"/>
            <h2 :class="TYPOGRAPHY.cardTitle">{{ householdAddress }}</h2>
            <span v-if="householdFamilyName" :class="TYPOGRAPHY.bodyTextMuted">· {{ householdFamilyName }}</span>
          </div>
          <!-- Visitor banner: shown when viewing another household -->
          <UAlert
            v-if="!canEdit"
            data-testid="visitor-banner"
            icon="i-heroicons-eye"
            color="info"
            variant="subtle"
            title="Du besøger nu en anden husstand end din egen"
            description="Kigge, ikke røre"
          />
        </div>
      </template>
      <UTabs
          v-model="activeTab"
          :items="tabItems"
          class="mt-1 mb-1 md:mt-0 md:mb-4"
          :ui="{ label: 'hidden md:inline' }"
          color="primary"
      >
        <template #content="{ item }">
          <component :is="asyncComponents[item.value]" :household="selectedHousehold" :can-edit="canEdit"/>
        </template>
      </UTabs>
    </UCard>
  </div>
</template>
