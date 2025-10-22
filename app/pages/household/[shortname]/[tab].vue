<script setup lang="ts">
/**
 * Household Detail Page - Shows household booking interface with tabs
 *
 * URL: /household/[shortname]
 * Example: /household/hansen-familie
 *
 * Displays:
 * - Tilmeldinger tab: Calendar + booking management
 * - Allergier tab: Family allergies
 * - Økonomi tab: Cost breakdown
 * - Husstanden tab: Household members
 * - Indstillinger tab: Settings
 */

const route = useRoute()

// Get shortname from route
const shortname = computed(() => route.params.shortname as string)

// Initialize stores
const householdStore = useHouseholdsStore()
const {selectedHousehold, isLoading: householdLoading, error: householdError} = storeToRefs(householdStore)

const planStore = usePlanStore()
const {activeSeason} = storeToRefs(planStore)

// Initialize stores on client-side (ADR-007: stores initialized in onMounted)
onMounted(async () => {
  await householdStore.initHouseholdsStore(shortname.value)
  await planStore.initPlanStore()
})

// Season dates for calendar
const seasonDates = computed(() => {
  if (!activeSeason.value) {
    return {start: new Date(), end: new Date()}
  }
  return activeSeason.value.seasonDates
})

// Holidays from active season
const holidays = computed(() => {
  if (!activeSeason.value) return []
  return activeSeason.value.holidays
})

// TODO: Load dinner events for active season
// Endpoint: GET /api/admin/dinner-event?seasonId={id}
const dinnerEvents = ref([])

// TODO: Load orders for household inhabitants
// No endpoint exists yet - needs implementation
const orders = ref([])

useHead({
  title: `🏠 ${selectedHousehold.value?.name || shortname.value}`,
  meta: [
    {
      name: "Husstand",
      content: `Tilmeldinger for husstanden ${selectedHousehold.value?.name || shortname.value}`,
    },
  ],
})
</script>

<template>
  <div>
    <!-- Loading state -->
    <UCard v-if="householdLoading" class="text-center p-4">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin" />
      <p class="text-muted">Indlæser husstand...</p>
    </UCard>

    <!-- Error state -->
    <UCard v-else-if="householdError" class="text-center p-4">
      <UIcon name="i-heroicons-exclamation-triangle" class="text-red-500" />
      <p class="text-red-700">{{ householdError }}</p>
    </UCard>

    <!-- No active season -->
    <UCard v-else-if="!activeSeason" class="text-center p-4">
      <UIcon name="i-heroicons-calendar-days" class="text-yellow-500" />
      <p class="text-yellow-700">Ingen aktiv sæson fundet. Kontakt administratoren.</p>
    </UCard>

    <!-- Household card with tabs -->
    <HouseholdCard
      v-else-if="selectedHousehold"
      :household="selectedHousehold"
      :season-dates="seasonDates"
      :dinner-events="dinnerEvents"
      :orders="orders"
      :holidays="holidays"
    />
  </div>
</template>