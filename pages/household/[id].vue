<script setup lang="ts">


definePageMeta({
  validate: async (route) => {
    // Check if the id is made up of S or T, followed by 1 or 2 digits, ie addresser af typen T1 and S31
    // needs to look up the address in the database, this is just a simple input validation
    return /^[S,s,T,t]\d{1,2}$/.test(<string>route.params.id)
  }
})

const route = useRoute()
const householdId = route.params.id
const url = `/api/household/${householdId}`

const calendarFeed = ref(null)
const calendarError = ref(null)

const householdApiRef = apiRef({
  route: '/api/household/:id',
  method: 'get',
  defaultValue: null
})

const { data, error } = await useFetch(url)

async function getCalendarFeedForUser(user: string) {
  console.info('getCalendarFeedForUser')
  calendarFeed.value = await $fetch('/api/calendar/feed')
}
</script>

<template>
  <div class="text-base text-amber-900">
    <h1 class="text-lg uppercase text-blue-curacao-900">Husstands overblik for {{ householdId }}</h1>

    <HouseholdView v-if="data" :household="data">
    </HouseholdView>
    <Loader v-else>
      Loading data for household {{ householdId }}
    </Loader>

    <!-- Placeholder for kalender med overblik over familiens bestilte spisebiletter -->
    <div>
      <h2>Bestilte Spisebiletter</h2>
      <p>10-01-2025</p>

      <UButton icon="i-pajamas-calendar" v-bind='download="Skråningen fællesspisninger.ical"'
               @click="getCalendarFeedForUser('Agata')">Abonner på Kalender for Agata
      </UButton>

      <!-- Placeholder til calendar komponent -->
      <div>
        <div v-if="calendarFeed">
          <a href="/api/calendar/feed">Calendar feed</a>
          <p>Data: {{ calendarFeed }}</p>
        </div>
        <Loader v-else>
          Loading calendar feed...
        </Loader>
      </div>
    </div>
  </div>

</template>
