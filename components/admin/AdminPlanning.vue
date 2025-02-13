<script setup lang="ts">
const store = usePlanStore()
const {loadSeason} = store
loadSeason()

const showCreateSeason = ref(true)

const items = [{
  label: 'Fællesspisninger',
},
  {
    label: 'Madhold',
  },
  {
    label: 'Chefkokke',
  }]
</script>

<template>
  <div>
    <h1>Planlægning</h1>
    Overblik over madlavningshold
    Chefkok / medlemmer

    Fællesspisnings kalender
    Knap + form : Opret ny sæson : fra - til - tilføj ferier (form), ugedage
    Nuværende sæson
    Link til Næste sæson

    <UButton @click="showCreateSeason" class="m-4 " color="pink" size="lg" variant="soft"
             icon="i-pajamas-admin">
      Opret Fællesspisningssæson
    </UButton>

    <AdminCreateSeason />


  </div>
</template>
