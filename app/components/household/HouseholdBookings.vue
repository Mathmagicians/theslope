<script setup lang="ts">
/**
 * HouseholdBookings - Booking management (Tilmeldinger tab content)
 *
 * UX: Master-detail pattern
 * - Master (Calendar): 1/3 width on large screens, shows 1 month
 * - Detail (Booking panel): 2/3 width, shows selected day details
 */
import type {HouseholdDetail} from '~/composables/useCoreValidation'

interface Props {
  household: HouseholdDetail
}

const props = defineProps<Props>()
const {household} = toRefs(props)

const {deadlinesForSeason} = useSeason()
const {computeLockStatus} = useBooking()
const {ICONS, COLOR} = useTheSlopeDesignSystem()

const planStore = usePlanStore()
const {selectedSeason, isSelectedSeasonInitialized, isSelectedSeasonLoading, isSelectedSeasonErrored} = storeToRefs(planStore)
planStore.initPlanStore()

const bookingsStore = useBookingsStore()
const {orders} = storeToRefs(bookingsStore)

const seasonDates = computed(() => selectedSeason.value?.seasonDates ?? { start: new Date(), end: new Date() })
const dinnerEvents = computed(() => selectedSeason.value?.dinnerEvents ?? [])
const holidays = computed(() => selectedSeason.value?.holidays ?? [])
const lockStatus = computed(() => selectedSeason.value ? computeLockStatus(dinnerEvents.value, deadlinesForSeason(selectedSeason.value)) : new Map())

const {view, selectedDate, dateRange, setDate} = useBookingView({
  syncWhen: () => isSelectedSeasonInitialized.value
})

const handleDateSelected = (date: Date) => setDate(date)

// Find dinner event for selected date
const selectedDinnerEvent = computed(() => {
  if (!selectedDate.value) return null
  return dinnerEvents.value.find(e =>
    new Date(e.date).toDateString() === selectedDate.value.toDateString()
  ) ?? null
})

// Load orders when dinner event changes
watchEffect(() => {
  if (selectedDinnerEvent.value) {
    bookingsStore.loadOrdersForDinner(selectedDinnerEvent.value.id, true)
  }
})

// Season data for view components
const ticketPrices = computed(() => selectedSeason.value?.ticketPrices ?? [])
const deadlines = computed(() => selectedSeason.value ? deadlinesForSeason(selectedSeason.value) : undefined)

// Grid view (week/month) is full-width without calendar
const isGridView = computed(() => view.value === 'week' || view.value === 'month')
</script>

<template>
  <Loader v-if="isSelectedSeasonLoading" text="Henter sæsondata..." />
  <ViewError v-else-if="isSelectedSeasonErrored" text="Kan ikke hente sæsondata" />
  <div v-else-if="isSelectedSeasonInitialized && selectedSeason" data-testid="household-bookings">
    <!-- Grid view (week/month): Full-width without calendar -->
    <template v-if="isGridView && deadlines">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-semibold">Familiens bookinger</h3>
        <BookingViewSwitcher v-model="view" />
      </div>
      <BookingGridView
        :view="view"
        :date-range="dateRange"
        :household="household"
        :dinner-events="dinnerEvents"
        :orders="orders"
        :ticket-prices="ticketPrices"
        :deadlines="deadlines"
      />
    </template>

    <!-- Day view: Master-detail with calendar -->
    <template v-else>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Master: Calendar -->
        <div class="lg:col-span-1">
          <DinnerCalendarDisplay
            :season-dates="seasonDates"
            :holidays="holidays"
            :dinner-events="dinnerEvents"
            :lock-status="lockStatus"
            :selected-date="selectedDate"
            :number-of-months="1"
            @date-selected="handleDateSelected"
          />
        </div>

        <!-- Detail: Familiens bookinger -->
        <div class="lg:col-span-2">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-semibold">Familiens bookinger</h3>
                <BookingViewSwitcher v-model="view" />
              </div>
            </template>
            <DinnerBookingForm
              v-if="selectedDinnerEvent && deadlines"
              :household="household"
              :dinner-event="selectedDinnerEvent"
              :orders="orders"
              :ticket-prices="ticketPrices"
              :deadlines="deadlines"
            />
            <UAlert
              v-else
              :icon="ICONS.calendar"
              :color="COLOR.neutral"
              variant="soft"
              title="Vælg en dato"
              description="Klik på en dato i kalenderen for at se og redigere bookinger"
            />
          </UCard>
        </div>
      </div>
    </template>
  </div>
  <UAlert
    v-else
    :icon="ICONS.calendar"
    :color="COLOR.primary"
    variant="subtle"
    title="Ingen aktiv sæson"
    description="Der er ingen aktiv fællesspisnings sæson i øjeblikket. Kontakt administratoren for at aktivere en sæson."
    data-testid="household-bookings-empty"
  />
</template>
