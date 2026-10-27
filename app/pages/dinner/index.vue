<script setup lang="ts">
/**
 * Dinner Page - Master/Detail view of communal dinners
 *
 * UX: Master-detail pattern (LAYOUTS.masterDetailPage on UPage)
 * md and up                                                 phone
 * +-- a third, at least 245px --+ +-- the rest ----------+  +----------------------------+
 * | DinnerCalendarDisplay       | | the selected dinner  |  | DinnerCalendarDisplay      |
 * | countdown, calendar, legend | | (detail view below)  |  +----------------------------+
 * +-----------------------------+ +----------------------+  | the selected dinner        |
 *                                                           +----------------------------+
 *
 * Detail view: DinnerDetailPanel lays out three slots; each component's header draws its own layout.
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ #hero  [ChefMenuCard] in view mode: the dinner, its menu and allergens     │
 * │        └─ [DinnerBookingForm] the household's tickets and queue places     │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ #team  [CookingTeamCard] (monitor) or the no-team alert, [WorkAssignment]  │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ #stats [KitchenPreparation] the kitchen stats with the alternating fourth  │
 * │        box (TIL SALG or VENTELISTE), drawn in KitchenPreparation.vue       │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

import {FORM_MODES} from '~/types/form'
import type {DesiredOrder} from '~/composables/useBookingValidation'
import {EMPTY_RELEASED_TICKET_COUNTS} from '~/composables/useBooking'

// Design system
const { COLOR, COMPONENTS, ICONS, ALERTS, LAYOUTS, getRandomEmptyMessage, NOISE, SIZES } = useTheSlopeDesignSystem()

// Fun empty state for no team assigned
const noTeamMessage = getRandomEmptyMessage('noTeamAssigned')

// Toast for user feedback
const toast = useToast()

// Auth store for current user info (used in booking handlers)
const authStore = useAuthStore()
const {user} = storeToRefs(authStore)
// The household the booking form books for: its order names the people in the save's toast
const {selectedHousehold} = storeToRefs(useHouseholdsStore())

// Booking validation and helpers
const {BOOKING_TOAST_TITLES} = useBooking()

// Component needs to handle its own data needs
const planStore = usePlanStore()
const {selectedSeason, isPlanStoreReady, isSelectedSeasonInitialized, isSelectedSeasonErrored} = storeToRefs(planStore)

const {value: calendarOpen, setValue: setCalendarOpen} = useCalendarOpenParam(() => isPlanStoreReady.value)


const bookingsStore = useBookingsStore()
useUsersStore()  // chef-volunteer flow needs it instantiated in setup context

const {
  lockStatus,
  householdWaitlist,
  selectedDinnerWaitlist,
  selectedDinnerEventDetail: dinnerEventDetail,
  isSelectedDinnerEventLoading: isDinnerDetailLoading,
  isSelectedDinnerEventErrored: isDinnerDetailError
} = storeToRefs(bookingsStore)
const {getTeamNumber} = useCookingTeam()

// The team card reads the dinner's cooking team from the plan store
planStore.selectTeam(() => dinnerEventDetail.value?.cookingTeamId ?? null)

// Derive needed data from store
const seasonDates = computed(() => selectedSeason.value?.seasonDates)
const holidays = computed(() => selectedSeason.value?.holidays ?? [])
const cookingDays = computed(() => selectedSeason.value?.cookingDays)
const dinnerEvents = computed(() => selectedSeason.value?.dinnerEvents ?? [])

const {deadlinesForSeason} = useSeason()

// Date selection via URL query parameter (curried pattern)
const dinnerDates = computed(() => dinnerEvents.value.map(e => new Date(e.date)))
const syncWhen = () => isPlanStoreReady.value && dinnerDates.value.length > 0

const {value: selectedDate, setValue: setDate} = useDinnerDateParam({
    dinnerDates: () => dinnerDates.value,
    syncWhen
})

// Navigation logic (hasPrev, hasNext, navigate)
const {hasPrev, hasNext, navigate} = useBookingView({
    selectedDate,
    setDate,
    dinnerDates: () => dinnerDates.value
})

// The store resolves the dinner on the URL date from the selected season, so the server renders its Detail
bookingsStore.selectDinnerDate(selectedDate)
const {selectedDinnerEventId: selectedDinnerId} = storeToRefs(bookingsStore)

// Household-specific orders via the user-facing endpoint (security: session-filtered).
// Separate from dinnerEventDetail.tickets, which includes ALL households for kitchen stats.
const {orders: householdOrders, isBookingsReloading} = storeToRefs(bookingsStore)
bookingsStore.loadOrdersForDinners(() => ({
  dinnerEventIds: selectedDinnerId.value === null ? [] : [selectedDinnerId.value],
  includeProvenance: true
}))

// ADR-016: Unified booking handler via scaffold endpoint
const handleSaveBookings = async (orders: DesiredOrder[]) => {
  const householdId = user.value?.Inhabitant?.household?.id
  const dinnerEventId = selectedDinnerId.value

  if (orders.length === 0 || !householdId || !dinnerEventId) {
    console.warn('Missing data for booking:', {orders: orders.length, householdId, dinnerEventId})
    return
  }

  // Detect guest bookings for appropriate toast
  const isGuestBooking = orders.every(o => o.isGuestTicket)
  const toastTitle = isGuestBooking ? BOOKING_TOAST_TITLES.guest : BOOKING_TOAST_TITLES.booking

  try {
    const response = await bookingsStore.processSingleEventBookings(householdId, dinnerEventId, orders)
    toast.add(scaffoldToast(toastTitle, response.scaffoldResult, selectedHousehold.value?.inhabitants.map(({id}) => id)))
  } catch {
    // The request has toasted the failure
  }
}

useHead({
  title: '🍽️ Fællesspisning',
  meta: [
    {
      name: 'description',
      content: 'Tilmelding til dagens fællesspisning'
    }
  ]
})
</script>

<template>
  <Loader v-if="!isPlanStoreReady" text="Henter sæsondata..." />
  <ViewError v-else-if="isSelectedSeasonErrored" text="Kan ikke hente sæsondata" />
  <UPage v-else-if="isSelectedSeasonInitialized && !selectedSeason">
    <div :class="COMPONENTS.dinnerPage.emptyFrame">
      <UAlert
        v-bind="ALERTS.emptyState"
        :icon="ICONS.robotDead"
      >
        <template #title>
          Her ser lidt tomt ud!
        </template>
        <template #description>
          Bed din administrator om at oprette og aktivere en fællespisningssæson.
        </template>
        <template #actions>
          <UButton
            :color="COLOR.secondary"
            :variant="NOISE.loud"
            to="/admin/planning"
            :icon="ICONS.plusCircle"
            :size="SIZES.lg"
          >
            Værsgo, opret en ny sæson
          </UButton>
        </template>
      </UAlert>
    </div>
  </UPage>
  <UPage v-else-if="isSelectedSeasonInitialized && selectedSeason" :ui="LAYOUTS.masterDetailPage">
    <!-- Master: Calendar (left slot) -->
    <template #left>
      <CalendarMasterPanel>
        <template #calendar>
          <DinnerCalendarDisplay
            v-if="seasonDates && selectedDate"
            v-model:calendar-open="calendarOpen"
            :season-dates="seasonDates"
            :cooking-days="cookingDays"
            :holidays="holidays"
            :dinner-events="dinnerEvents"
            :lock-status="lockStatus"
            :show-countdown="true"
            :color="COLOR.peach"
            :selected-date="selectedDate"
            @date-selected="setDate"
          />
        </template>
      </CalendarMasterPanel>
    </template>

    <!-- Detail: Dinner info (page owns data, passes to pure layout) -->
    <DinnerDetailPanel
      :dinner-event="dinnerEventDetail"
      :ticket-prices="selectedSeason?.ticketPrices ?? []"
      :is-loading="isDinnerDetailLoading"
      :is-error="isDinnerDetailError"
    >
      <!-- #hero: ChefMenuCard in VIEW mode with DinnerBookingForm -->
      <template #hero>
        <ChefMenuCard
          v-if="dinnerEventDetail && selectedSeason"
          :dinner-event="dinnerEventDetail"
          :deadlines="deadlinesForSeason(selectedSeason)"
          :form-mode="FORM_MODES.VIEW"
          :show-state-controls="false"
          :show-allergens="true"
          :has-prev="hasPrev"
          :has-next="hasNext"
          :calendar-open="calendarOpen"
          @prev="navigate(-1)"
          @next="navigate(1)"
          @toggle-calendar="setCalendarOpen(!calendarOpen)"
        >
          <!-- Household booking form - uses session-filtered orders (not admin's all-households tickets); the card draws the cancelled ribbon -->
          <DinnerBookingForm
            :ribbon="false"
            :dinner-event="dinnerEventDetail"
            :orders="householdOrders"
            :ticket-prices="selectedSeason?.ticketPrices ?? []"
            :deadlines="deadlinesForSeason(selectedSeason)"
            :released-ticket-counts="lockStatus.get(dinnerEventDetail.id) ?? EMPTY_RELEASED_TICKET_COUNTS"
            :waitlist-entries="householdWaitlist"
            :loading="isBookingsReloading"
            @save-bookings="handleSaveBookings"
          />

        </ChefMenuCard>
      </template>

      <!-- #team: Cooking team info -->
      <template #team>
        <template v-if="dinnerEventDetail">
          <CookingTeamCard
            v-if="dinnerEventDetail.cookingTeamId && dinnerEventDetail.cookingTeam"
            :team-id="dinnerEventDetail.cookingTeamId"
            :team-number="getTeamNumber(dinnerEventDetail.cookingTeam, selectedSeason?.CookingTeams ?? [])"
            mode="monitor"
            use-short-name
          />
          <UAlert
            v-else
            v-bind="ALERTS.info"
          >
            <template #title>{{ noTeamMessage.emoji }} {{ noTeamMessage.text }}</template>
          </UAlert>
          <WorkAssignment :dinner-event="dinnerEventDetail"/>
        </template>
      </template>

      <!-- #stats: Kitchen statistics -->
      <template #stats>
        <KitchenPreparation
          v-if="dinnerEventDetail"
          :orders="dinnerEventDetail.tickets ?? []"
          :allergens="dinnerEventDetail.allergens"
          :waitlist="selectedDinnerWaitlist"
        />
      </template>
    </DinnerDetailPanel>
  </UPage>
</template>
