<script setup lang="ts">
const selectedTab = ref(0)
const items = [
  {
    title: 'Planlægning',
    icon: 'i-heroicons-calendar',
    content: 'Planlægning af middage og events. Oprette fællesspisninger (dinnerevents). Se kalendar, oprette sæson, oprette ferier. See teams. Se chefkokke',
    component: 'AdminPlanning'
  },
  {
    title: 'Husstande',
    icon: 'i-heroicons-home',
    content: 'Oversigt over husstande. Se allergier. Administrer flytninger og husstandsændringer',
    component: 'AdminHouseholds'
  },
  {
    title: 'Allergier',
    icon: 'i-heroicons-hand-raised',
    content: 'Se allergier. Administrer allergier. Plakat til udprintning.',
    component: 'AdminAllergies'
  },
  {
    title: 'Brugere',
    icon: 'i-heroicons-users',
    content: 'Importer data fra Heynabo. Se importerede brugere fra HeyNabo. Administrer brugere',
    component: 'AdminUsers'
  },
  {
    title: 'Økonomi',
    icon: 'i-heroicons-currency-dollar',
    content: 'Økonomisk overblik. Chefkokkebudgetter. Basisvarerbudgetter. Inberetning til PBS.',
    component: 'AdminEconomy'
  },
  {
    title: 'Indstillinger',
    icon: 'i-heroicons-cog-6-tooth',
    content: 'Se systemindstillinger. Ændre systemindstillinger.',
    component: 'AdminSettings'
  }
]

const asyncComponents = items.map(item => defineAsyncComponent(() => import(`@/components/admin/${item.component}.vue`)))

useHead({
  title: "😎 Administration",
  meta: [
    {
      name: "Administration",
      content: "you can view households and their dinner preferences here",
    },
  ],
});
</script>

<template>

  <div class="py-1 md:py-2 lg:p-4 min-h-screen">
    <UTabs
        v-model="selectedTab"
        :items="items"
        class="w-7/8"
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
          <component v-if="selected " :is="asyncComponents[index]"/>
        </div>
      </template>
    </UTabs>
  </div>
</template>
