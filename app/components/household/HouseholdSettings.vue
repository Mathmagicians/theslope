<script setup lang="ts">
// Mockup: Calendar feed subscription (from old household/_id.vue)
const calendarFeed = ref(null)
const getCalendarFeedForUser = async (userName: string) => {
  console.info('getCalendarFeedForUser', userName)
  calendarFeed.value = await $fetch('/api/calendar/feed')
}
</script>

<template>
  <div data-test-id="household-settings" class="space-y-6">
    <div>
      <h3 class="text-lg font-semibold mb-4">Kalenderabonnement</h3>
      <p class="text-muted mb-4">
        Abonner på familiens fællesspisningskalender i din foretrukne kalenderapp (Google Calendar, Apple Calendar,
        Outlook)
      </p>

      <UButton
          icon="i-heroicons-calendar"
          color="primary"
          @click="getCalendarFeedForUser('householdname')"
      >
      Hent kalender (.ical)
      </UButton>

      <div v-if="calendarFeed" class="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded">
        <p class="text-sm text-muted mb-2">Kalenderfeed genereret:</p>
        <a
            href="/api/calendar/feed"
            class="text-primary hover:underline text-sm"
            download="skraaningen-faellesspisning.ics"
        >
          Download skraaningen-faellesspisning.ics
        </a>
      </div>
    </div>

    <div class="border-t pt-6">
      <h3 class="text-lg font-semibold mb-4">Notifikationer</h3>
      <p class="text-muted">Notifikationsindstillinger kommer snart...</p>
      <!-- TODO: Notification preferences -->
    </div>

    <div class="border-t pt-6">
      <h3 class="text-lg font-semibold mb-4">Præferencer</h3>
      <p class="text-muted">Generelle præferencer kommer snart...</p>
      <!-- TODO: User preferences -->
    </div>
  </div>
</template>
