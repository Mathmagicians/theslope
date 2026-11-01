<script setup lang="ts">
import {ADMIN_WORDS} from '~/config/adminWords'

const {ALERTS, COLOR, ICONS, COMPONENTS} = useTheSlopeDesignSystem()

// AUTHORIZATION - Admin role check for edit actions (ADR pattern from household page)
const authStore = useAuthStore()
const {isAdmin, isAllergyManager} = storeToRefs(authStore)

// canEdit: Admin can edit most tabs
// canMutateAllergies: Admin OR AllergyManager can edit allergies tab
const canEdit = computed(() => isAdmin.value)
const canMutateAllergies = computed(() => isAdmin.value || isAllergyManager.value)

// COMPONENT DEPENDENCIES
const store = usePlanStore()
const {
  isPlanStoreReady,
  isPlanStoreErrored,
  planStoreError,
  isSeasonsInitialized, isActiveSeasonIdInitialized, isSelectedSeasonInitialized, isNoSeasons
} = storeToRefs(store)

// DEBUG: Log store ready conditions
watch([isSeasonsInitialized, isActiveSeasonIdInitialized, isSelectedSeasonInitialized, isNoSeasons, isPlanStoreReady],
  ([seasons, activeId, selected, noSeasons, ready]) => {
    console.info(LOG_CTX, '🔍 > Store ready check:', {seasons, activeId, selected, noSeasons, ready})
  }
)

// DEBUG: Log error state details
watch([isPlanStoreErrored, planStoreError], ([errored, error]) => {
  if (errored) {
    const {isSeasonsErrored, isActiveSeasonIdErrored, isSelectedSeasonErrored} = storeToRefs(store)
    console.error(LOG_CTX, '❌ > Plan store error detected:',
      'seasons:', isSeasonsErrored.value,
      'activeId:', isActiveSeasonIdErrored.value,
      'selected:', isSelectedSeasonErrored.value,
      'status:', error?.statusCode,
      'message:', error?.message)
  }
})

// UI - ITEMS
const tabs = [
  {key: 'planning', label: ADMIN_WORDS.tabs.planning, icon: ICONS.calendar, component: 'AdminPlanning'},
  {key: 'teams', label: ADMIN_WORDS.tabs.teams, icon: ICONS.chef, component: 'AdminTeams'},
  {key: 'households', label: ADMIN_WORDS.tabs.households, icon: ICONS.household, component: 'AdminHouseholds'},
  {key: 'allergies', label: ADMIN_WORDS.tabs.allergies, icon: ICONS.allergy, component: 'AdminAllergies'},
  {key: 'users', label: ADMIN_WORDS.tabs.users, icon: ICONS.users, component: 'AdminUsers'},
  {key: 'economy', label: ADMIN_WORDS.tabs.economy, icon: ICONS.economy, component: 'AdminEconomy'},
  {key: 'system', label: ADMIN_WORDS.tabs.system, icon: ICONS.settings, component: 'AdminSystem'}
]


const asyncComponents = Object.fromEntries(
    tabs.map(tab => [
      tab.key,
      defineAsyncComponent(() => import(`~/components/admin/${tab.component}.vue`))
    ])
)

// Tab items for UTabs component
const tabItems = tabs.map(item => ({
  ...item,
  value: item.key
}))


const {activeTab} = useTabNavigation({
  tabs: tabs.map(t => t.key),
  basePath: '/admin'
})

// SEASON QUERY PARAMETER - Auto-validates and corrects invalid season URLs
const {seasons, selectedSeason} = storeToRefs(store)
const {value: seasonShortName} = useQueryParam<string | null>('season', {
  serialize: (name) => name ?? '',
  deserialize: (s) => s || null,
  validate: (name) => !name || seasons.value.some(s => s.shortName === name),
  defaultValue: () => selectedSeason.value?.shortName ?? null,  // Use store's selected season
  syncWhen: () => isPlanStoreReady.value  // Wait for seasons to load before auto-correcting
})

// The store follows ?season= through the ref, on the server render and the client alike (ADR-007 rule 9)
store.selectSeason(seasonShortName)

// The team follows ?team= from setup on, so a deep link's team Detail loads in the server render, before AdminTeams
// sets up behind the ready gate; AdminTeams writes the param only
const route = useRoute()
store.selectTeam(() => {
  const teamId = Number(route.query.team)
  return activeTab.value === 'teams' && Number.isInteger(teamId) && teamId > 0 ? teamId : null
})

// The billing periods and the current period load while the economy tab is on the page
useBookingsStore().loadBillingOverview(() => activeTab.value === 'economy')

// UI - CONTINUED

useHead({
  title: ADMIN_WORDS.page.title,
  meta: [
    {
      name: "description",
      content: ADMIN_WORDS.page.description,
    },
  ],
})

</script>


<template>
  <div :class="COMPONENTS.adminPage.root">
    <!-- Non-admin banner: shown when viewing as non-admin user -->
    <UAlert
      v-if="!canEdit"
      v-bind="ALERTS.neutral"
      data-testid="admin-readonly-banner"
      :icon="ICONS.viewOnly"
      :title="ADMIN_WORDS.readOnly.title"
      :description="ADMIN_WORDS.readOnly.description"
      :class="COMPONENTS.adminPage.banner"
    />
    <UTabs
        v-model="activeTab"
        v-bind="COMPONENTS.adminPage.tabs"
        :items="tabItems"
        :color="COLOR.primary"
    >
      <template #content="{ item }">
        <ViewError
            v-if="isPlanStoreErrored && (activeTab === 'planning' || activeTab === 'teams')"
            :error="planStoreError?.statusCode"
            :message="ADMIN_WORDS.failed(activeTab)"
            :cause="planStoreError"/>
        <Loader v-else-if="!isPlanStoreReady && (activeTab === 'planning' || activeTab === 'teams')" :text="activeTab"/>
        <!-- Pass canEdit to components (allergies tab uses canMutateAllergies) -->
        <component
          :is="asyncComponents[item.value]"
          v-else
          :can-edit="item.value === 'allergies' ? canMutateAllergies : canEdit"
        />
      </template>
    </UTabs>
  </div>
</template>
