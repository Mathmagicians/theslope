<script setup lang="ts">

// COMPONENT DEPENDENCIES
const toast = useToast()
const {init} = usePlanStore()
const route = useRoute()
const router = useRouter()
const url = useRequestURL()

// UI - ITEMS
const baseItems = [
  {
    label: 'Planlægning',
    icon: 'i-heroicons-calendar',
    content: 'Planlægning af middage og events. Oprette fællesspisninger (dinnerevents). Se kalendar, oprette sæson, oprette ferier. See teams. Se chefkokke',
    component: 'AdminPlanning'
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

const defaultTabValue = items[0]!.value
const tabFromHash = (hash: string | undefined) => hash ? hash.slice(1).toLowerCase() : defaultTabValue
const hashFromTab = (tab: string) => `#${tab.toLowerCase()}`
// STATE
const selectedTab = ref(tabFromHash(route.hash))


// COMPUTED STATE
const activeTab = computed({
  get() {
    return selectedTab.value
  },
  set(tab) {
    selectedTab.value = tab && asyncComponents[tab] ? tab : defaultTabValue
    updateHashFromTab(selectedTab.value)
    console.info('🔗 > Admin > activeTab > setting tab:', tab, ', selectedTab:', selectedTab.value, 'url.hash:', url.hash)
  }
})

// ACTIONS

// updates the page fragement # in the url to match the selected tab
const updateHashFromTab = (tab: string) => {
  const hash = hashFromTab(tab)
  if (route.hash === hash) return // no need to update
  navigateTo({
    path: route.path,
    hash: hash,
    query: route.query
  }, {replace: true})
  console.info('🔗 > Admin > updateHashFromTab > updated hash:', hash, 'requested tab:', tab)
}

// INITIALIZATION
onMounted(() => {
  // If URL doesn't have a hash or has a different hash than our selected tab
  if (!url.hash || !asyncComponents[tabFromHash(url.hash)]) {
    console.info('🔗 > Admin > onMounted > no hash in URL, or invalid hash, setting hash to selectedTab:', selectedTab.value)
    updateHashFromTab(selectedTab.value)
  } else if (asyncComponents[tabFromHash(url.hash)] && tabFromHash(url.hash) !== selectedTab.value) {
    console.info('🔗 > Admin > onMounted > valid hash in URL, updating activeTab to hash:', url.hash, '->', selectedTab.value)
    activeTab.value = tabFromHash(url.hash)
  } else {
    console.info('🔗 > Admin > onMounted > hash in URL matches selectedTab:', selectedTab.value, 'hash:', url.hash, 'no action needed')
  }
})


// /*
// watch(selectedTab, (newVal, oldVal) => {
//   if (newVal === oldVal) return
//   console.info('🔗 > Admin > watch selectedTab > tab changed:', oldVal, '->', newVal)
//   updateHashFromTab()
// })
//
// watch(() => router.currentRoute.value.hash, (newHash, oldHash) => {
//   if (newHash === oldHash) return
//   console.info('🔗 > Admin > watch route.hash > hash changed:', oldHash, '->', newHash)
//   syncTabWithHash(newHash)
// })
// */

const {status, error} = await useAsyncData('planStore', async () => {
  await init()
  toast.add({
    id: 'seasons-loaded',
    title: 'Data for Sæsoner indlæst',
    description: 'Sæsoner er indlæst og klar til brug',
    color: 'info'
  })
  return {initialized: true}
})

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
    <Loader v-if="status==='pending'"/>
    <ViewError v-else-if="error" :error="500" message="Kunne ikke loade data for admin siden" :cause="error"/>
    <div class="relative py-1 md:py-2 lg:p-4 min-h-screen">
      <!-- Invisible scroll anchor -->
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
      <client-only>
        <p> DEBUG: selectedTab is {{ selectedTab }}. Full path: {{ route.fullPath }} hash is: {{ route.hash }}</p>
        <p>currentRoute in router: {{ router.currentRoute.value.hash }}</p>
      </client-only>
    </div>
  </div>
</template>
