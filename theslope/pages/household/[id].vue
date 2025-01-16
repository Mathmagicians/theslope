<script setup lang="ts">

import { useFileSystemAccess } from '@vueuse/core'

definePageMeta({
  validate: async (route) => {
    // Check if the id is made up of S or T, followed by 1 or 2 digits, ie addresser af typen T1 and S31
    // needs to look up the address in the database, this is just a simple input validation
    return /^[S,s,T,t]\d{1,2}$/.test(route.params.id)
  }
})

const data = ref(null)
const error = ref(null)

async function getCalendarFeedForUser(user: string) {
  console.log('getCalendarFeedForUser')
  data.value = await $fetch('/api/calendar/feed')
}
</script>

<template>
  <div class="text-base text-mocha-mousse-900">
    <h1>Husstands overblik</h1>
    <p>Adress: {{ $route.params.id }}</p>
    <h2>Husstandsmedlemmer</h2>
    Agata
    <h2>Bestilte Spisebiletter</h2>
    <p>10-01-2025</p>

    <UButton icon="i-pajamas-calendar" v-bind='download="Skråningen fællesspisninger.ical"' @click="getCalendarFeedForUser('Agata')">Abonner på Kalender for Agata</UButton>

    <div v-if="data">
     <a href="/api/calendar/feed">Calendar feed</a>

      Data: {{ data}}
    </div>
    <div v-else>
      Loading...
    </div>
  </div>
</template>
