<script setup lang="ts">
/**
 * Dinner Page - Master/Detail view of communal dinners
 *
 * UX: Master-detail pattern
 * - Master (Calendar): 1/4 width, shows calendar with dinner events
 * - Detail (Dinner info): 3/4 width, shows selected day details
 *
 * Detail View Layout:
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ MENU HERO (UCard Header - Full Bleed)                                      │
 * │ ┌─────────────────────────────────────────────────────────────────────────┐ │
 * │ │ [Baggrund: Menu Foto eller Fast Farve]                                  │ │
 * │ │                                                                          │ │
 * │ │                       SPAGHETTI CARBONARA                                │ │
 * │ │               Cremet pasta med bacon og parmesan                         │ │
 * │ │                                                                          │ │
 * │ │     Allergener: 🥛 Laktose   🌾 Gluten   🥚 Æg                           │ │
 * │ │                                                                          │ │
 * │ │     [Bestil] [Byt] [Annuller] [Skift Servering]                         │ │
 * │ └─────────────────────────────────────────────────────────────────────────┘ │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ KØKKEN FORBEREDELSE (UCard Body - Full Bleed)                              │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ 👨‍🍳 Chefkok: Anna Larsen                                                   │
 * │ 👥 Madhold 3: Bob Jensen, Clara Nielsen, David Hansen                      │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │                          LAV MAD - 100%                                     │
 * │  100 PORTIONER                                                              │
 * │  Voksne: 80  |  Børn: 40 (20 portioner)  |  Baby: 5 (0 portioner)          │
 * ├──────────────────────────┬─────────────────────┬──────────────┬────────────┤
 * │   TAKEAWAY - 40%         │  SPIS HER - 35%     │SPIS SENT-20% │IKKE-5%     │
 * │                          │                     │              │            │
 * │      50 personer         │    44 personer      │  25 personer │ 6 personer │
 * │                          │                     │              │            │
 * │    40 portioner          │     35 stole        │   20 stole   │            │
 * │    40 tallerkener        │   33 tallerkener    │18 tallerkener│            │
 * │                          │                     │              │            │
 * │    🌾 Maria (2)          │   🥛 Anna (3)       │  🌾 Peter    │            │
 * │    🥚 Tom (1)            │   🥚 Lars (1)       │              │            │
 * │                          │                     │              │            │
 * └──────────────────────────┴─────────────────────┴──────────────┴────────────┘
 * ←─────────── 40% ─────────→←──────── 35% ──────→←──── 20% ───→←─── 5% ──→
 */

import {FORM_MODES} from '~/types/form'
import type {OrderDisplay, DesiredOrder} from '~/composables/useBookingValidation'
import {useDinnerDateParam, useBookingView} from '~/composables/useBookingView'
import {useQueryParam} from '~/composables/useQueryParam'

// Design system
const { COLOR, BACKGROUNDS, ICONS, getRandomEmptyMessage } = useTheSlopeDesignSystem()

// Fun empty state for no team assigned
const noTeamMessage = getRandomEmptyMessage('noTeamAssigned')

// Toast for user feedback
const toast = useToast()

// Auth store for current user info (used in booking handlers)
const authStore = useAuthStore()
const {user} = storeToRefs(authStore)

// Booking validation and helpers
const {formatScaffoldResult} = useBooking()

// Component needs to handle its own data needs
const planStore = usePlanStore()
const {selectedSeason, isPlanStoreReady, isSelectedSeasonInitialized, isSelectedSeasonErrored} = storeToRefs(planStore)

// Responsive breakpoint for calendar default state
const isMd = inject<Ref<boolean>>('isMd')

// Calendar accordion state via URL param + responsive default (ADR-006)
const {value: calendarOpen, setValue: setCalendarOpen} = useQueryParam<boolean>('cal', {
  serialize: (v) => v ? 'open' : 'closed',
  deserialize: (s) => s === 'open' ? true : s === 'closed' ? false : null,
  defaultValue: () => isMd?.value ?? false,
  syncWhen: () => isPlanStoreReady.value
})
// Initialize without await for SSR hydration consistency
planStore.initPlanStore()

// Initialize allergies store for allergen data
const allergiesStore = useAllergiesStore()
allergiesStore.initAllergiesStore()

// Bookings store (lock status)
const bookingsStore = useBookingsStore()
const {lockStatus} = storeToRefs(bookingsStore)

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

// Selected dinner event based on URL date
const selectedDinnerEvent = computed(() => {
    return dinnerEvents.value.find(e => {
        const eventDate = new Date(e.date)
        return eventDate.toDateString() === selectedDate.value.toDateString()
    })
})

// Selected dinner ID for data fetching
const selectedDinnerId = computed(() => selectedDinnerEvent.value?.id ?? null)

// Page owns dinner detail data (ADR-007: page owns data, layout receives via props)
const { DinnerEventDetailSchema, OrderDisplaySchema } = useBookingValidation()

const {
  data: dinnerEventDetail,
  status: dinnerEventDetailStatus,
  refresh: refreshDinnerEventDetail
} = useAsyncData(
  computed(() => `dinner-detail-${selectedDinnerId.value || 'null'}`),
  () => selectedDinnerId.value
    ? bookingsStore.fetchDinnerEventDetail(selectedDinnerId.value)
    : Promise.resolve(null),
  {
    default: () => null,
    watch: [selectedDinnerId],
    immediate: true,
    transform: (data: unknown) => {
      if (!data) return null
      try {
        return DinnerEventDetailSchema.parse(data)
      } catch (e) {
        console.error('Error parsing dinner event detail:', e)
        throw e
      }
    }
  }
)

// Fetch household-specific orders via user-facing endpoint (security: session-filtered)
// This is separate from dinnerEventDetail.tickets which includes ALL households for kitchen stats
const {
  data: householdOrders,
  refresh: _refreshHouseholdOrders
} = useAsyncData(
  computed(() => `household-orders-${selectedDinnerId.value || 'null'}`),
  () => selectedDinnerId.value
    ? $fetch<OrderDisplay[]>(`/api/order?dinnerEventIds=${selectedDinnerId.value}`)
    : Promise.resolve([]),
  {
    default: () => [],
    watch: [selectedDinnerId],
    immediate: true,
    transform: (data: unknown) => {
      if (!Array.isArray(data)) return []
      return data.map(order => OrderDisplaySchema.parse(order))
    }
  }
)

// Helper to refresh both data sources after booking changes
const refreshBookingData = async () => {
  await Promise.all([refreshDinnerEventDetail(), _refreshHouseholdOrders()])
}

// ADR-016: Unified booking handler via scaffold endpoint
const handleSaveBookings = async (orders: DesiredOrder[]) => {
  const householdId = user.value?.Inhabitant?.household?.id
  const dinnerEventId = selectedDinnerId.value

  if (orders.length === 0 || !householdId || !dinnerEventId) {
    console.warn('Missing data for booking:', {orders: orders.length, householdId, dinnerEventId})
    return
  }

  try {
    const response = await bookingsStore.processSingleEventBookings(householdId, dinnerEventId, orders)
    await refreshBookingData()
    toast.add({
      title: formatScaffoldResult(response.scaffoldResult),
      color: 'success',
      icon: ICONS.checkCircle
    })
  } catch (e) {
    console.error('Failed to process bookings:', e)
    toast.add({title: 'Kunne ikke gemme bookinger', color: 'error', icon: ICONS.exclamationCircle})
  }
}

const isDinnerDetailLoading = computed(() => dinnerEventDetailStatus.value === 'pending')
const isDinnerDetailError = computed(() => dinnerEventDetailStatus.value === 'error')

useHead({
  title: '🍽️ Fællesspisning',
  meta: [
    {
      name: 'Fællesspisning',
      content: 'Tilmelding til dagens fællesspisning'
    }
  ]
})
</script>

<template>
  <Loader v-if="!isPlanStoreReady" text="Henter sæsondata..." />
  <ViewError v-else-if="isSelectedSeasonErrored" text="Kan ikke hente sæsondata" />

  <!-- No selected season state -->
  <UPage v-else-if="isSelectedSeasonInitialized && !selectedSeason">
    <div :class="`p-4 md:p-8 ${BACKGROUNDS.card}`">
      <UAlert
        type="info"
        variant="soft"
        :color="COLOR.info"
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
            variant="solid"
            to="/admin/planning"
            :icon="ICONS.plusCircle"
            size="lg"
          >
            Værsgo, opret en ny sæson
          </UButton>
        </template>
      </UAlert>
    </div>
  </UPage>

  <!-- Main master-detail layout -->
  <UPage v-else-if="isSelectedSeasonInitialized && selectedSeason">
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
          <!-- Household booking form - uses session-filtered orders (not admin's all-households tickets) -->
          <DinnerBookingForm
            :dinner-event="dinnerEventDetail"
            :orders="householdOrders"
            :ticket-prices="selectedSeason?.ticketPrices ?? []"
            :deadlines="deadlinesForSeason(selectedSeason)"
            :released-ticket-count="lockStatus.get(dinnerEventDetail.id) ?? 0"
            @save-bookings="handleSaveBookings"
          />

        </ChefMenuCard>
      </template>

      <!-- #team: Cooking team info -->
      <template #team>
        <template v-if="dinnerEventDetail">
          <CookingTeamCard
            v-if="dinnerEventDetail.cookingTeamId"
            :team-id="dinnerEventDetail.cookingTeamId"
            :team-number="dinnerEventDetail.cookingTeamId"
            mode="monitor"
            use-short-name
          />
          <UAlert
            v-else
            variant="soft"
            :color="COLOR.info"
          >
            <template #title>{{ noTeamMessage.emoji }} {{ noTeamMessage.text }}</template>
          </UAlert>
          <WorkAssignment :dinner-event="dinnerEventDetail" @role-assigned="refreshDinnerEventDetail"/>
        </template>
      </template>

      <!-- #stats: Kitchen statistics -->
      <template #stats>
        <KitchenPreparation
          v-if="dinnerEventDetail"
          :orders="dinnerEventDetail.tickets ?? []"
          :allergens="dinnerEventDetail.allergens"
        />
      </template>
    </DinnerDetailPanel>
  </UPage>
</template>
