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

import {useQueryParam} from '~/composables/useQueryParam'
import {FORM_MODES, type FormMode} from '~/types/form'
import type {DinnerMode, OrderDisplay} from '~/composables/useBookingValidation'

// Design system
const { COLOR, BACKGROUNDS, ICONS, getRandomEmptyMessage } = useTheSlopeDesignSystem()

// Fun empty state for no team assigned
const noTeamMessage = getRandomEmptyMessage('noTeamAssigned')

// Booking form state - EDIT mode prevents accidental changes
const bookingFormMode = ref<FormMode>(FORM_MODES.VIEW)

// Booking handlers - update individual order (uses householdOrders, not dinnerEventDetail.tickets)
const handleBookingUpdate = async (inhabitantId: number, dinnerMode: DinnerMode, _ticketPriceId: number) => {
  const order = householdOrders.value?.find(o => o.inhabitantId === inhabitantId)
  if (!order?.id) {
    console.warn('No order found for inhabitant', inhabitantId)
    return
  }

  try {
    await bookingsStore.updateOrder(order.id, { dinnerMode })
    await refreshBookingData()
    console.info('Booking updated:', { inhabitantId, dinnerMode, orderId: order.id })
  } catch (e) {
    console.error('Failed to update booking:', e)
  }
}

// Bulk update all orders for current household (security: only household orders via session-filtered endpoint)
const handleAllBookingsUpdate = async (dinnerMode: DinnerMode) => {
  const orders = householdOrders.value ?? []
  if (orders.length === 0) return

  try {
    await Promise.all(
      orders.filter(o => o.id).map(order => bookingsStore.updateOrder(order.id!, { dinnerMode }))
    )
    await refreshBookingData()
    console.info('All household bookings updated:', { dinnerMode, count: orders.length })
  } catch (e) {
    console.error('Failed to update all bookings:', e)
  }
}


// Component needs to handle its own data needs
const planStore = usePlanStore()
const {selectedSeason, isPlanStoreReady, isSelectedSeasonInitialized, isSelectedSeasonErrored} = storeToRefs(planStore)
// Initialize without await for SSR hydration consistency
planStore.initPlanStore()

// Initialize allergies store for allergen data
const allergiesStore = useAllergiesStore()
allergiesStore.initAllergiesStore()

// Derive needed data from store
const seasonDates = computed(() => selectedSeason.value?.seasonDates)
const holidays = computed(() => selectedSeason.value?.holidays ?? [])
const cookingDays = computed(() => selectedSeason.value?.cookingDays)
const dinnerEvents = computed(() => selectedSeason.value?.dinnerEvents ?? [])

// Get dinner start time and deadline functions from season configuration
const {getDefaultDinnerStartTime, getNextDinnerDate, deadlinesForSeason} = useSeason()
const dinnerStartTime = getDefaultDinnerStartTime()

// Season-specific deadline functions (computed to react to season changes)

// Date selection via URL query parameter
const dinnerDates = computed(() => dinnerEvents.value.map(e => new Date(e.date)))
const getDefaultDate = (): Date => {
    const nextDinner = getNextDinnerDate(dinnerDates.value, dinnerStartTime)
    return nextDinner?.start ?? new Date()
}

const {value: selectedDate, setValue} = useQueryParam<Date>('date', {
    serialize: formatDate,
    deserialize: (s) => {
        const parsed = parseDate(s)
        return parsed && !isNaN(parsed.getTime()) ? parsed : null
    },
    validate: (date) => {
        // Check if this date has a dinner event
        return dinnerEvents.value.some(e => {
            const eventDate = new Date(e.date)
            return eventDate.toDateString() === date.toDateString()
        })
    },
    defaultValue: getDefaultDate,
    // Auto-sync URL when store is ready and events are loaded
    syncWhen: () => isPlanStoreReady.value && dinnerEvents.value.length > 0
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
const bookingsStore = useBookingsStore()
const { DinnerEventDetailSchema, OrderDisplaySchema } = useBookingValidation()

const {
  data: dinnerEventDetail,
  status: dinnerEventDetailStatus,
  refresh: _refreshDinnerEventDetail
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
    ? $fetch<OrderDisplay[]>(`/api/order?dinnerEventId=${selectedDinnerId.value}`)
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
  await Promise.all([_refreshDinnerEventDetail(), _refreshHouseholdOrders()])
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
      <CalendarMasterPanel title="Fællesspisningens kalender">
        <template #calendar>
          <DinnerCalendarDisplay
            v-if="seasonDates && selectedDate"
            :season-dates="seasonDates"
            :cooking-days="cookingDays"
            :holidays="holidays"
            :dinner-events="dinnerEvents"
            :show-countdown="true"
            :color="COLOR.peach"
            :selected-date="selectedDate"
            @date-selected="setValue"
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
        >
          <!-- Household booking form - uses session-filtered orders (not admin's all-households tickets) -->
          <DinnerBookingForm
            :dinner-event="dinnerEventDetail"
            :orders="householdOrders"
            :ticket-prices="selectedSeason?.ticketPrices ?? []"
            :deadlines="deadlinesForSeason(selectedSeason)"
            :form-mode="bookingFormMode"
            @update-booking="handleBookingUpdate"
            @update-all-bookings="handleAllBookingsUpdate"
          />

          <!-- Booking action button -->
          <div class="mt-4">
            <UButton
              v-if="bookingFormMode === FORM_MODES.VIEW"
              :color="COLOR.warning"
              variant="solid"
              size="lg"
              name="edit-booking"
              block
              :icon="ICONS.edit"
              @click="bookingFormMode = FORM_MODES.EDIT"
            >
              Rediger booking
            </UButton>

            <UButton
              v-else
              color="neutral"
              variant="outline"
              size="lg"
              name="back-from-booking"
              block
              :icon="ICONS.arrowLeft"
              @click="bookingFormMode = FORM_MODES.VIEW"
            >
              Tilbage
            </UButton>
          </div>
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
          />
          <UAlert
            v-else
            variant="soft"
            :color="COLOR.info"
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
        />
      </template>
    </DinnerDetailPanel>
  </UPage>
</template>
