<script setup lang="ts">
const {households} = storeToRefs(useHouseholdsStore())
const {loadData} = useHouseholdsStore()
await loadData()

const householdColumns = [
  {key: 'id', label: 'ID', class: 'text-orange-mandarin-800'},
  {key: 'address', label: 'Adresse', class: 'text-blue-900'}
]

useHead({
  title: "🏠Households",
  meta: [
    {
      name: "description",
      content: "view householdss here",
    },
  ],
});
</script>

<template>
  <div>
    <h1 class="text-orange-mandarin-900 text-xl">Oversigt over husstande på Skråningen</h1>
    <h2 class="text-orange-mandarin-600 text-sm">
      Her ser du en tabel med husstande, og view / edit knapper der leder til /household/[id]
      man kan se navne, børn/voksen/baby billettype, billeder
    </h2>

    <!-- show when households are loaded -->
    <div  v-if="households">
      <UTable
              :columns="householdColumns"
              :rows="households"
      />

    </div>
    <!-- show when households are not loaded -->
    <div v-else>
      <UIcon name="i-pajamas-user"/>
      <p class="text-blue-curacao-700">Loading households...</p>
  </div>
  </div>
</template>
