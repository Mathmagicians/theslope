<script setup lang="ts">
const store = useHouseholdsStore()
const { households } = storeToRefs(store)
const {loadData} = useHouseholdsStore()
await loadData()

const householdColumns = [
  {key: 'id', label: 'ID', class: 'text-orange-800'},
  {key: 'address', label: 'Adresse', class: 'text-blue-900'}
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
    <h1 class="text-orange-900 text-xl">Oversigt over husstande på Skråningen</h1>
    <h2 class="text-orange-600 text-sm">
      Her ser du en tabel med husstande, og view / edit knapper der leder til /household/[id]
      man kan se navne, børn/voksen/baby billettype, billeder
    </h2>

    <!-- show when households are loaded -->
    <UCard  v-if="households ? households.length > 0: false"
            :ui="{
          background: 'bg-white dark:bg-amber-800',
          divide: 'divide-amber-50 dark:divide-amber-900'}"
        >
      <UTable
              :columns="householdColumns"
              :rows="households"
      />
    </UCard>
    <!-- show when households are not loaded -->
    <UCard class="text-center p-4" v-else>
      <UIcon name="i-pajamas-user"/>
      <p class="text-blue-700">Loading households...</p>
  </UCard>
  </div>
</template>
