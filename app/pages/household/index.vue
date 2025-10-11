<script setup lang="ts">
const store = useHouseholdsStore()
const { households } = storeToRefs(store)
const {loadHouseholds} = store
await loadHouseholds()

const householdColumns = [
  {accessorKey: 'id', header: 'ID'},
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
      Her ser du en tabel med husstande, og view / edit knapper der leder til /household/[id]
      man kan se navne, børn/voksen/baby billettype, billeder
    </h2>

    <!-- show when households are loaded -->
    <UCard  v-if="households ? households.length > 0: false"
        >
      <UTable
              :columns="householdColumns"
              :data="households ? households : []"
      />
    </UCard>
    <!-- show when households are not loaded -->
    <UCard class="text-center p-4" v-else>
      <UIcon name="i-pajamas-user"/>
      <p class="text-blue-700">Loading households...</p>
  </UCard>
  </div>
</template>
