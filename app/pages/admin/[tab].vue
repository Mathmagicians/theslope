<script setup lang="ts">

// COMPONENT DEPENDENCIES
const store = usePlanStore()
const {initPlanStore} = store
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
    console.error(LOG_CTX, '❌ > Plan store error detected:', {
      isSeasonsErrored: isSeasonsErrored.value,
      isActiveSeasonIdErrored: isActiveSeasonIdErrored.value,
      isSelectedSeasonErrored: isSelectedSeasonErrored.value,
      error: error
    })
  }
})

// UI - ITEMS
const tabs = [
  {
    key: 'planning',
    label: 'Planlægning',
    icon: 'i-heroicons-calendar',
    content: 'Planlægning af middage og events. Oprette fællesspisninger (dinnerevents). Se kalendar, oprette sæson, oprette ferier. See teams. Se chefkokke',
    component: 'AdminPlanning'
  },
  {
    key: 'teams',
    label: 'Madhold',
    icon: 'i-fluent-mdl2-team-favorite',
    content: 'Oprette madhold i given sæson og administrere madhold. Tildele madhold til madlavningsdage. Tildele medlemmer til madhold',
    component: 'AdminTeams'
  },
  {
    key: 'chefs',
    label: 'Chefkokke',
    icon: 'i-streamline-food-kitchenware-chef-toque-hat-cook-gear-chef-cooking-nutrition-tools-clothes-hat-clothing-food',
    content: 'Se og administrer chefkokke. Tildele chefkokke til madlavningsdage',
    component: 'AdminChefs'
  },
  {
    key: 'households',
    label: 'Husstande',
    icon: 'i-heroicons-home',
    content: 'Oversigt over husstande. Se allergier. Administrer flytninger og husstandsændringer',
    component: 'AdminHouseholds'
  },
  {
    key: 'allergies',
    label: 'Allergier',
    icon: 'i-mdi-food-allergy-off-outline',
    content: 'Se allergier. Administrer allergier. Plakat til udprintning.',
    component: 'AdminAllergies'
  },
  {
    key: 'users',
    label: 'Brugere',
    icon: 'i-heroicons-users',
    content: 'Importer data fra Heynabo. Se importerede brugere fra HeyNabo. Administrer brugere',
    component: 'AdminUsers'
  },
  {
    key: 'economy',
    label: 'Økonomi',
    icon: 'i-heroicons-currency-dollar',
    content: 'Økonomisk overblik. Chefkokkebudgetter. Basisvarerbudgetter. Inberetning til PBS.',
    component: 'AdminEconomy'
  },
  {
    key: 'settings',
    label: 'Indstillinger',
    icon: 'i-heroicons-cog-6-tooth',
    content: 'Se systemindstillinger. Ændre systemindstillinger.',
    component: 'AdminSettings'
  }
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

// INITIALIZATION - Initialize store to load seasons list
initPlanStore()

// SEASON QUERY PARAMETER - Auto-validates and corrects invalid season URLs
const {seasons, selectedSeason} = storeToRefs(store)
const {value: seasonShortName} = useQueryParam<string | undefined>('season', {
  serialize: (name) => name ?? '',
  deserialize: (s) => s || undefined,
  validate: (name) => !name || seasons.value.some(s => s.shortName === name),
  defaultValue: () => selectedSeason.value?.shortName,  // Use store's selected season
  syncWhen: () => isPlanStoreReady.value  // Wait for seasons to load before auto-correcting
})

// Watch season query and initialize store with the selected season
watch(seasonShortName, (shortName) => {
  if (shortName && shortName !== selectedSeason.value?.shortName) {
    initPlanStore(shortName)
    console.info(LOG_CTX, '🔗 > Admin > Loading season from URL:', shortName)
  }
}, { immediate: true })

// UI - CONTINUED

useHead({
  title: "😎 Administration",
  meta: [
    {
      name: "Administration",
      content: "you can view households and their dinner preferences here",
    },
  ],
})

</script>


<template>
  <div class="md:py-2 lg:p-4 min-h-screen">
    <UTabs
        v-model="activeTab"
        :items="tabItems"
        class="mb-1 md:mb-4"
        :ui="{
          label: 'hidden md:inline',
          list: 'sticky top-12 md:top-16 z-20 rounded-none md:rounded-lg'
        }"
        color="primary"
    >
      <template #content="{ item }">
        <ViewError
            v-if="isPlanStoreErrored && (activeTab === 'planning' || activeTab === 'teams')"
            :error="planStoreError?.statusCode"
            :message="`Kunne ikke loade data for admin siden - tab ${ activeTab }`"
            :cause="planStoreError"/>
        <Loader v-else-if="!isPlanStoreReady && (activeTab === 'planning' || activeTab === 'teams')" :text="activeTab"/>
        <component :is="asyncComponents[item.value]" v-else/>
      </template>
    </UTabs>
  </div>
</template>
