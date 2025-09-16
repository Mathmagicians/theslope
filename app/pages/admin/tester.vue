<script setup lang="ts">

// COMPONENT DEPENDENCIES
const toast = useToast()
const {init} = usePlanStore()
const route = useRoute()
const router = useRouter()
const url = useRequestURL()

// UI - ITEMS
const items = [

  {
    label: 'Brugere',
    icon: 'i-heroicons-users',
    content: 'Importer data fra Heynabo. Se importerede brugere fra HeyNabo. Administrer brugere',
    component: 'AdminUsers',
    value: 'AdminUsers'
  },
  {
    label: 'Økonomi',
    icon: 'i-heroicons-currency-dollar',
    content: 'Økonomisk overblik. Chefkokkebudgetter. Basisvarerbudgetter. Inberetning til PBS.',
    component: 'AdminEconomy',
    value: 'AdminEconomy'
  },
  {
    label: 'Indstillinger',
    icon: 'i-heroicons-cog-6-tooth',
    content: 'Se systemindstillinger. Ændre systemindstillinger.',
    component: 'AdminSettings',
    value: 'AdminSettings'
  }
]

const asyncComponents = Object.fromEntries(
    items.map(item => [
      item.value,
      defineAsyncComponent(() => import(`~/components/admin/${item.component}.vue`))
    ])
)
const defaultTab = 'AdminUsers'

// STATE
const selectedTab = ref(defaultTab)

const activeTab = computed({
  get() {
    return (route.hash as string) || defaultTab
  },
  set(tab) {
    const computedHash = asyncComponents[tab] ?`#${tab.toLowerCase()}`: `#${defaultTab.toLowerCase()}`
    console.log('AdminTester > activeTab > setting tab:', {tab, computedHash})
    // Hash is specified here to prevent the page from scrolling to the top
    router.push({
      path: route.path,
      query: route.query,
      hash: computedHash
    })
  }
})

</script>


<template>
  <div>
    <div class="py-1 md:py-2 lg:p-4 min-h-screen">
      <client-only>
        <p> DEBUG: selectedTab is {{ selectedTab }}. Full path: {{ route.fullPath }} hash is: {{ route.hash }}</p>
        <p>currentRoute in router: {{ router.currentRoute.value.hash }}</p>
      </client-only>

      <UTabs
          v-model="activeTab"
          :items="items"
          class="w-full"
          color="primary"
          default-value="0"
      >
        <template #content="{ item }">
          <!-- Invisible anchor for Vue Router scroll behavior -->
          <div class="flex flex-col gap-2 md:gap-4 overflow-hidden">
            <a :id="`${item.value.toLowerCase()}`" class="border-blue-600 border-8">{{
                item.value.toLowerCase()
              }}</a>
            <p>DEBUG: Current item is {{ item.label }}, selectedTab is {{ selectedTab }}</p>
            <component :is="asyncComponents[selectedTab]"/>
          </div>
        </template>
      </UTabs>
    </div>
  </div>
</template>
