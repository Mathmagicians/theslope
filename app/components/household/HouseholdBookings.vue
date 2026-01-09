<script setup lang="ts">
/**
 * HouseholdBookings - Booking management (Tilmeldinger tab content)
 *
 * UX: Master-detail pattern
 * - Master (Calendar): 1/3 width on large screens, shows 1 month
 * - Detail (Booking panel): 2/3 width, shows selected day details
 */

interface Inhabitant {
  id: number
  name: string
  lastName: string
  birthDate?: Date | null
}

interface Household {
  id: number
  name: string
  shortName: string
  inhabitants: Inhabitant[]
}

interface Props {
  household: Household
}

const _props = defineProps<Props>()

const {deadlinesForSeason} = useSeason()
const {computeLockStatus} = useBooking()

const planStore = usePlanStore()
const {selectedSeason, isSelectedSeasonInitialized, isSelectedSeasonLoading, isSelectedSeasonErrored} = storeToRefs(planStore)
planStore.initPlanStore()

const seasonDates = computed(() => selectedSeason.value?.seasonDates ?? { start: new Date(), end: new Date() })
const dinnerEvents = computed(() => selectedSeason.value?.dinnerEvents ?? [])
const holidays = computed(() => selectedSeason.value?.holidays ?? [])
const lockStatus = computed(() => selectedSeason.value ? computeLockStatus(dinnerEvents.value, deadlinesForSeason(selectedSeason.value)) : new Map())

const selectedDate = ref<Date | null>(null)
</script>

<template>
  <Loader v-if="isSelectedSeasonLoading" text="Henter sæsondata..." />
  <ViewError v-else-if="isSelectedSeasonErrored" text="Kan ikke hente sæsondata" />
  <div v-else-if="isSelectedSeasonInitialized && selectedSeason" data-testid="household-bookings">
    <!-- Master-Detail layout -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Master: Calendar -->
      <div class="lg:col-span-1">
        <DinnerCalendarDisplay
          :season-dates="seasonDates"
          :holidays="holidays"
          :dinner-events="dinnerEvents"
          :lock-status="lockStatus"
          :selected-date="selectedDate ?? undefined"
          :number-of-months="1"
          @date-selected="selectedDate = $event"
        />
      </div>

      <!-- Detail: Familiens bookinger -->
      <div class="lg:col-span-2">
        <UCard>
          <template #header>
            <h3 class="text-sm font-semibold">Familiens bookinger</h3>
          </template>
          <!-- New component will go here -->
        </UCard>
      </div>
    </div>
  </div>
  <UAlert
    v-else
    icon="i-heroicons-calendar-days"
    color="primary"
    variant="subtle"
    title="Ingen aktiv sæson"
    description="Der er ingen aktiv fællesspisnings sæson i øjeblikket. Kontakt administratoren for at aktivere en sæson."
    data-testid="household-bookings-empty"
  />
</template>
