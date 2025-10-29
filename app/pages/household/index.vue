<script setup lang="ts">
const store = useHouseholdsStore()
const {households, isHouseholdsLoading, isNoHouseholds, isHouseholdsErrored} = storeToRefs(store)
const {initHouseholdsStore} = store
await initHouseholdsStore()

const householdColumns = [
  {accessorKey: 'id', header: 'ID'},
  {accessorKey: 'shortName', header: 'Kort navn'},
  {accessorKey: 'address', header: 'Adresse'}
]

useHead({
  title: "🏠Husholdningen",
  meta: [
    {
      name: "Husholdningen",
      content: "Du kan se husholdinger og deres tilmeldinger her",
    },
  ],
});
</script>

<template>
  <div>
    <Loader v-if="isHouseholdsLoading" text="Henter husstande på Skråningen"/>
    <ViewError v-else-if="isHouseholdsErrored"/>
    <UCard v-else
           data-test-id="households"
           class="w-full px-0"
    >
      <template #header>
        <h1 class="text-xl">Oversigt over husstande på Skråningen</h1>
        <h2 class="text-muted">
          Klik på linket med adressen for at se husstandens tilmeldinger og kalender
        </h2>
      </template>
      <UTable
          :columns="householdColumns"
          :data="households"
          empty="🧘‍♀️ Ingen husstande fundet"
          :loading="isHouseholdsLoading"
      >
        <!-- Custom shortName cell with link -->
        <template #shortName-cell="{ row }">
          <NuxtLink
              :to="`/household/${encodeURIComponent(row.original.shortName)}`"
              class="text-primary hover:underline font-medium"
          >
            {{ row.original.shortName }}
          </NuxtLink>
        </template>
      </UTable>
    </UCard>
  </div>
</template>
