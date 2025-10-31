<script setup lang="ts">

// COMPONENT DEPENDENCIES
const store = usePlanStore()
const {initPlanStore} = store
const {isPlanStoreReady, isSeasonsErrored, seasonsError} = storeToRefs(store)

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
    icon: 'i-heroicons-hand-raised',
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

// INITIALIZATION
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
        <ViewError v-if="isSeasonsErrored" :error="seasonsError?.statusCode"
                   :message="`Kunne ikke loade data for admin siden - tab ${ activeTab }`" :cause="seasonsError"/>
        <Loader v-else-if="!isPlanStoreReady" :text="activeTab"/>
        <component v-else :is="asyncComponents[item.value]"/>
      </template>
    </UTabs>
  </div>
</template>
