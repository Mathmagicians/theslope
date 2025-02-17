<script setup lang="ts">
import type { FormMode } from '@/types/form'
import {FORM_MODES} from "@/types/form"

const store = usePlanStore()
const {loadSeason} = store
loadSeason()

const formMode = ref<FormMode>(FORM_MODES.VIEW)

const showCreateSeason = () => {
  console.log('Show Not implemented yet')
}

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
    <UCard>
      <template #header>
        <div class="flex flex-row items-center justify-between">
          <FormModeSelector/>
          <UHorizontalNavigation :items="items" />
        </div>
      </template>
    </UCard>
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
