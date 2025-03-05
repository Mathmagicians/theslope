<script setup lang="ts">

// COMPONENT DEPENDENCIES
const toast = useToast()
const {init} = usePlanStore()

// STATE
const selectedTab = ref(0)

// UI
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

useHead({
  title: "😎 Administration",
  meta: [
    {
      name: "Administration",
      content: "you can view households and their dinner preferences here",
    },
  ],
})

// INITIALIZATION
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
</script>


<template>
  <div>
    <Loader v-if="status === 'pending'"/>
    <ViewError v-else-if="error" :error="500" message="Kunne ikke loade data for admin siden" :cause="error"/>
    <div
        v-if="status !== 'pending'"
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
        <div class="flex flex-col gap-2 md:gap-4">
          <Ticker class="py-1" :words="item.content.split('.')"/>
          <ClientOnly>
            <component v-if="selected" :is="asyncComponents[index]"/>
          </ClientOnly>
        </div>
      </template>
    </UTabs>
  </div>
  </div>
</template>
