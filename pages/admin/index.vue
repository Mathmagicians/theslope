<script setup lang="ts">

// COMPONENT DEPENDENCIES
const toast = useToast()
const {init} = usePlanStore()
const route = useRoute()
const router = useRouter()

// UI - ITEMS
const items = [
  {
    label: 'Planlægning',
    title: 'Planlægning',
    icon: 'i-heroicons-calendar',
    content: 'Planlægning af middage og events. Oprette fællesspisninger (dinnerevents). Se kalendar, oprette sæson, oprette ferier. See teams. Se chefkokke',
    component: 'AdminPlanning'
  },
  {
    label: 'Husstande',
    title: 'Husstande',
    icon: 'i-heroicons-home',
    content: 'Oversigt over husstande. Se allergier. Administrer flytninger og husstandsændringer',
    component: 'AdminHouseholds'
  },
  {
    label: 'Allergier',
    title: 'Allergier',
    icon: 'i-heroicons-hand-raised',
    content: 'Se allergier. Administrer allergier. Plakat til udprintning.',
    component: 'AdminAllergies'
  },
  {
    label: 'Brugere',
    title: 'Brugere',
    icon: 'i-heroicons-users',
    content: 'Importer data fra Heynabo. Se importerede brugere fra HeyNabo. Administrer brugere',
    component: 'AdminUsers'
  },
  {
    label: 'Økonomi',
    title: 'Økonomi',
    icon: 'i-heroicons-currency-dollar',
    content: 'Økonomisk overblik. Chefkokkebudgetter. Basisvarerbudgetter. Inberetning til PBS.',
    component: 'AdminEconomy'
  },
  {
    label: 'Indstillinger',
    title: 'Indstillinger',
    icon: 'i-heroicons-cog-6-tooth',
    content: 'Se systemindstillinger. Ændre systemindstillinger.',
    component: 'AdminSettings'
  }
]

const asyncComponents = items.map(item => defineAsyncComponent(() => import(`~/components/admin/${item.component}.vue`)))


// STATE
const selectedTab = ref(0)
const isInitialized = ref(false)

// COMPUTED STATE

const isReady = computed(() => status.value === 'success' && isInitialized.value)
const componentToTabIndex = computed(() => {
  return items.reduce((acc, item, index) => {
    acc[item.component.toLowerCase()] = index
    return acc
  }, {} as Record<string, number>)
})

// ACTIONS
const syncTabWithHash = () :boolean => {
  const hash = route.hash
  console.info('🔗 > Admin > syncTabWithHash > hash:', hash)
  if (hash) {
    const hashComponent = hash.slice(1).toLowerCase()
    const tab = componentToTabIndex.value[hashComponent]
    if ( hashComponent && tab) {
      selectedTab.value = tab
      console.info('🔗 > Admin > syncTabWithHash > selectedTab:', selectedTab.value, 'selected component:', hashComponent, 'isReady:', isReady.value)
      return true
    }
  }
  return false
}

// updates the page fragement # in the url to match the selected tab
const updateHashFromTab = () => {
  const component = items[selectedTab.value].component.toLowerCase()
  const hash = component ? `#${component}` : '#'
  console.log('🔗 > Admin > updateHashFromTab > selectedTab:', selectedTab.value, 'routes hash:', route.hash, 'hash:', hash, 'query:', route.query)
  router.replace({
    path: route.path,
    hash: hash,
    query: route.query
  },  { preserveState: true })
  console.info('🔗 > Admin > updateHashFromTab > updated hash:', component, 'with query:', route.query)
}

// WATCH
watch(selectedTab, () => {
  updateHashFromTab()
})

// INITIALIZATION

onMounted(() => {
  console.info('🔗 > Admin > onMounted >', 
    'route.hash:', route.hash,
    'route.query:', route.query, 
    'route.fullPath:', route.fullPath,
    'window.location.hash:', window.location.hash,
    'window.location.search:', window.location.search
  )
  
  // check if there is a hash in the url already and sync the tab with it
  const synced = syncTabWithHash()
  if (!synced) {
    updateHashFromTab()
  }
  isInitialized.value = true
})

const {status, error} = await useAsyncData('planStore', async () => {
  await init()
  toast.add({
    id: 'seasons-loaded',
    title: 'Data for Sæsoner indlæst',
    description: 'Sæsoner er indlæst og klar til brug',
    color: 'orange'
  })
  return { initialized: true }
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
    <div
        class="py-1 md:py-2 lg:p-4 min-h-screen">
    <UTabs
        v-model="selectedTab"
        :items="items"
        class="w-full "
        :ui="{
          list: {
          background: 'bg-amber-400 dark:bg-amber-500',
        tab: {
          active: 'bg-amber-100 dark:bg-amber-800 text-amber-900 dark:text-amber-100',
          inactive: 'bg-amber-400 dark:bg-amber-500 text-900 dark:text-amber-100'
        } }}"
        color="pink"
    >
      <template #default="{ item, selected, index }">
        <p class="hidden md:flex">{{ item.title }}</p>
      </template>
      <template #icon="{ item, selected }">
        <UIcon :name="item.icon" class="size-4 md:size-6 flex-shrink-0 mx-2"/>
      </template>
      <template #item="{ item, selected, index }">
        <!-- Invisible anchor above the content -->
        <a :id="item.component.toLowerCase()" style="position: relative; top: -80px; visibility: hidden;"></a>
        <div v-if="isInitialized"
            class="flex flex-col gap-2 md:gap-4">
          <Ticker class="py-1" :words="item.content.split('.')"/>
            <component v-if="selected" :is="asyncComponents[index]"/>
        </div>
      </template>
    </UTabs>
  </div>
  </div>
</template>
