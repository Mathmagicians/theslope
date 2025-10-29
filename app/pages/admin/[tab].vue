<script setup lang="ts">

// COMPONENT DEPENDENCIES
const toast = useToast()
const store = usePlanStore()
const {initPlanStore} = store
const {isPlanStoreReady, isSeasonsErrored, seasonsError} = storeToRefs(store)
const route = useRoute()

// UI - ITEMS
const baseItems = [
  {
    label: 'Planlægning',
    icon: 'i-heroicons-calendar',
    content: 'Planlægning af middage og events. Oprette fællesspisninger (dinnerevents). Se kalendar, oprette sæson, oprette ferier. See teams. Se chefkokke',
    component: 'AdminPlanning'
  },
  {
    label: 'Madhold',
    icon: 'i-fluent-mdl2-team-favorite',
    content: 'Oprette madhold i given sæson og administrere madhold. Tildele madhold til madlavningsdage. Tildele medlemmer til madhold',
    component: 'AdminTeams'
  },
  {
    label: 'Chefkokke',
    icon: 'i-streamline-food-kitchenware-chef-toque-hat-cook-gear-chef-cooking-nutrition-tools-clothes-hat-clothing-food',
    content: 'Se og administrer chefkokke. Tildele chefkokke til madlavningsdage',
    component: 'AdminChefs'
  },
  {
    label: 'Husstande',
    icon: 'i-heroicons-home',
    content: 'Oversigt over husstande. Se allergier. Administrer flytninger og husstandsændringer',
    component: 'AdminHouseholds'
  },
  {
    label: 'Allergier',
    icon: 'i-heroicons-hand-raised',
    content: 'Se allergier. Administrer allergier. Plakat til udprintning.',
    component: 'AdminAllergies'
  },
  {
    label: 'Brugere',
    icon: 'i-heroicons-users',
    content: 'Importer data fra Heynabo. Se importerede brugere fra HeyNabo. Administrer brugere',
    component: 'AdminUsers'
  },
  {
    label: 'Økonomi',
    icon: 'i-heroicons-currency-dollar',
    content: 'Økonomisk overblik. Chefkokkebudgetter. Basisvarerbudgetter. Inberetning til PBS.',
    component: 'AdminEconomy'
  },
  {
    label: 'Indstillinger',
    icon: 'i-heroicons-cog-6-tooth',
    content: 'Se systemindstillinger. Ændre systemindstillinger.',
    component: 'AdminSettings'
  }
]

const items = baseItems.map(item => ({
  ...item,
  value: item.component.toLowerCase()
}))

const asyncComponents = Object.fromEntries(
    items.map(item => [
      item.value,
      defineAsyncComponent(() => import(`~/components/admin/${item.component}.vue`))
    ])
)

const TAB_PREFIX = 'admin'
const defaultTabValue = items[0]!.value

const getSafeTab = (tab?: string) => tab && asyncComponents[tab] ? tab : defaultTabValue
const getSafeTabFromRoute = (routeParam: string | undefined) => {
  if( !routeParam ) return defaultTabValue
  return getSafeTab(`${TAB_PREFIX}${routeParam}`.toLowerCase())
}
const getParamFromTab = (tab: string) => tab.replace(TAB_PREFIX, '')


// COMPUTED STATE
const activeTab = computed({
  get() {
    const routeParam = route.params.tab as string
    const safeTab = getSafeTabFromRoute(routeParam)

    // If route param doesn't match the expected param for the safe tab, redirect
    if (routeParam && routeParam !== getParamFromTab(safeTab)) {
      navigateTo('/admin/planning', { replace: true })
    }

    return safeTab
  },
  async set(tab) {
    await updateRouteParamFromTab(getSafeTab(tab))
    console.info('🔗 > Admin > activeTab > setting tab:', tab, ', safeTab:', getSafeTab(tab), 'route.params.tab:', route.params.tab)
  }
})

// ACTIONS

// updates the URL path /admin/[tab] to match the selected tab
const updateRouteParamFromTab = async (tab: string) => {
  const param = getParamFromTab(tab)
  if (route.params.tab === param) return // no need to update
  await navigateTo({
    path: `/admin/${param}`,
    query: route.query
  }, {replace: true})
  console.info('🔗 > Admin > updateRouteParamFromTab > updated route:', route.path, 'requested tab:', tab)
}

// INITIALIZATION - Store handles its own initialization via internal watcher
// Just call init immediately (for potential shortName parameter handling)
initPlanStore()
console.info('🔗 > Admin > initialized parent page')

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
  <div>
    <Loader v-if="!isPlanStoreReady" :text="activeTab" />
    <ViewError v-else-if="isSeasonsErrored" :error="seasonsError?.statusCode" message="Kunne ikke loade data for admin siden" :cause="seasonsError"/>
    <div v-else class="relative py-1 md:py-2 lg:p-4 min-h-screen">
      <!-- Scroll anchor for current tab -->
      <a :id="activeTab" class="absolute w-0 h-0 -top-24 opacity-0 pointer-events-none" href="#">⚓︎</a>
      <UTabs
          v-model="activeTab"
          :items="items"
          class="w-full"
          color="primary"
      >
        <template #content="{ item }">
          <div class="flex flex-col gap-2 md:gap-4 overflow-hidden">
            <Ticker class="py-1" :words="item.content.split('.')"/>
            <component :is="asyncComponents[item.value]"/>
          </div>
        </template>
      </UTabs>
    </div>
  </div>
</template>
