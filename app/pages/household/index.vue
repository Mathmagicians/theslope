<script setup lang="ts">
const store = useHouseholdsStore()
const { households } = storeToRefs(store)
const {loadHouseholds} = store
await loadHouseholds()

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
      content: "you can view households and their dinner preferences here",
    },
  ],
});
</script>

<template>
  <div>
    <h1 class="text-xl">Oversigt over husstande på Skråningen</h1>
    <h2 class= "text-muted">
      Klik på kort navn for at se husstandens tilmeldinger og kalender
    </h2>

    <!-- show when households are loaded -->
    <UCard  v-if="households ? households.length > 0: false"
        >
      <UTable
              :columns="householdColumns"
              :data="households ? households : []"
      >
        <!-- Custom shortName cell with link -->
        <template #shortName-cell="{ row }">
          <NuxtLink
            :to="`/household/${row.original.shortName}`"
            class="text-primary hover:underline font-medium"
          >
            {{ row.original.shortName }}
          </NuxtLink>
        </template>
      </UTable>
    </UCard>
    <!-- show when households are not loaded -->
    <UCard class="text-center p-4" v-else>
      <UIcon name="i-pajamas-user"/>
      <p class="text-blue-700">Loading households...</p>
  </UCard>
  </div>
</template>
