<script setup lang="ts">
const selectedTab = ref(0)
const items = [
  {
    title: 'Planlægning',
    icon: 'i-heroicons-calendar',
    content: 'Planlægning af middage og events. Oprette fællesspisninger (dinnerevents). Se kalendar, oprette sæson, oprette ferier. See teams. Se chefkokke'
  },
  {
    title: 'Husstande',
    icon: 'i-heroicons-home',
    content: 'Oversigt over husstande. Se allergier. Administrer flytninger og husstandsændringer'
  },
  {
    title: 'Allergier',
    icon: 'i-heroicons-exclamation-circles',
    content: 'Se allergier'
  },
  {
    title: 'Brugere',
    icon: 'i-heroicons-users',
    content: 'Se importerede brugere fra HeyNabo. Administrer brugere'
  },
  {
    title: 'Økonomi',
    icon: 'i-heroicons-currency-dollar',
    content: 'Økonomisk overblik'
  },
  {
    title: 'Indstillinger',
    icon: 'i-heroicons-cog-6-tooth',
    content: 'Systemindstillinger'
  }
]

const userColumns = [
  {key: 'id', label: 'ID', class: 'text-orange-800'},
  {key: 'email', label: 'Mail', class: 'text-orange-800'},
  {key: 'phone', label: 'Telefon', class: 'text-orange-800'}]
</script>

<template>
  <div class="text-blue-900">
    <h1>😎Admin view</h1>
    <UDivider/>
    <ul>
      <li></li>
      <li></li>
      <li></li>
      <li></li>
      <li></li>
      <li></li>
      <li>Bytte vagt</li>
      <li>Bytte chefkokke vagt</li>
    </ul>
    <UDivider/>
    <!-- Claude colab start -->

    <div class="p-4 min-h-screen">
      <UTabs
          v-model="selectedTab"
          :items="items"
          class="w-full"
      >
        <template #default="{ item, selected, index }">
          <p class="hidden md:flex">{{ item.title }}</p>
        </template>
        <template #icon="{ item, selected }">
          <UIcon :name="item.icon" class="size-4 md:size-8 flex-shrink-0 me-2"/>
        </template>
        <template #item="{ item }" >
          <div class="bg-red-100 dark:bg-red-800 text-red-900 dark:text-red-50" >
          <h3><span class="m-2 md:m-4">ITEM SLOT: Here goes the content for {{ item.title }}!</span></h3>
            <p>{{ item.content }}</p>
          </div>
        </template>
      </UTabs>
    </div>
    <!-- Claude colab end -->
    <UDivider/>
  </div>
</template>
