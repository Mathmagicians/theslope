<script setup lang="ts">
/**
 * HouseholdBookings - Booking management (Tilmeldinger tab content)
 *
 * UX: Master-detail pattern
 * - Master (Calendar): 1/3 width on large screens, shows 1 month
 * - Detail (Booking panel): 2/3 width, shows selected day details
 */
import type {HouseholdDetail} from '~/composables/useCoreValidation'
import type {DesiredOrder, DinnerMode} from '~/composables/useBookingValidation'

interface Props {
  household: HouseholdDetail
}

const props = defineProps<Props>()
const {household} = toRefs(props)

const {deadlinesForSeason} = useSeason()
const {computeLockStatus, formatScaffoldResult} = useBooking()
const {ICONS, COLOR} = useTheSlopeDesignSystem()
const toast = useToast()

const planStore = usePlanStore()
const {selectedSeason, isSelectedSeasonInitialized, isSelectedSeasonLoading, isSelectedSeasonErrored} = storeToRefs(planStore)
planStore.initPlanStore()

const bookingsStore = useBookingsStore()
const {orders, isProcessingBookings} = storeToRefs(bookingsStore)

const seasonDates = computed(() => selectedSeason.value?.seasonDates ?? { start: new Date(), end: new Date() })
const dinnerEvents = computed(() => selectedSeason.value?.dinnerEvents ?? [])
const holidays = computed(() => selectedSeason.value?.holidays ?? [])
const lockStatus = computed(() => selectedSeason.value ? computeLockStatus(dinnerEvents.value, deadlinesForSeason(selectedSeason.value)) : new Map())

const {view, selectedDate, dateRange, setDate, navigate} = useBookingView({
  syncWhen: () => isSelectedSeasonInitialized.value,
  seasonDates: () => selectedSeason.value?.seasonDates ?? null,
  dinnerDates: () => dinnerEvents.value.map(e => new Date(e.date))
})

const handleDateSelected = (date: Date) => setDate(date)
const handleNavigate = (direction: 'prev' | 'next') => navigate(direction === 'next' ? 1 : -1)

// Find dinner event for selected date
const selectedDinnerEvent = computed(() => {
  if (!selectedDate.value) return null
  return dinnerEvents.value.find(e =>
    new Date(e.date).toDateString() === selectedDate.value.toDateString()
  ) ?? null
})

// Grid view (week/month) is full-width without calendar
const isGridView = computed(() => view.value === 'week' || view.value === 'month')

// Visible dinner event IDs based on view and date range (day=1, week=~4, month=~16)
const visibleDinnerEventIds = computed(() =>
  getEventsForGridView(dinnerEvents.value, dateRange.value).flat().map(e => e.id)
)

// Load orders for visible dinner events (grid view doesn't need provenance)
watchEffect(() => {
  if (visibleDinnerEventIds.value.length > 0) {
    bookingsStore.loadOrdersForDinners(visibleDinnerEventIds.value, !isGridView.value)
  }
})

// Season data for view components
const ticketPrices = computed(() => selectedSeason.value?.ticketPrices ?? [])
const deadlines = computed(() => selectedSeason.value ? deadlinesForSeason(selectedSeason.value) : undefined)

// Grid view form mode
const gridFormMode = ref<'view' | 'edit'>('view')

// Handle grid save - build DesiredOrders and call scaffold endpoint
const {getTicketPriceForInhabitant} = useTicket()
const {OrderStateSchema} = useBookingValidation()
const OrderState = OrderStateSchema.enum

const handleGridSave = async (changes: { inhabitantId: number, dinnerEventId: number, dinnerMode: DinnerMode }[]) => {
  if (!selectedSeason.value || changes.length === 0) return

  // Only process dinner events that have changes (not all visible events!)
  const changedEventIds = [...new Set(changes.map(c => c.dinnerEventId))]

  const desiredOrders = changes.map(change => {
    const inhabitant = household.value.inhabitants.find(i => i.id === change.inhabitantId)
    const event = dinnerEvents.value.find(e => e.id === change.dinnerEventId)
    const ticketPrice = getTicketPriceForInhabitant(inhabitant?.birthDate ?? null, ticketPrices.value, event?.date ?? new Date())
    const existingOrder = orders.value.find(o => o.inhabitantId === change.inhabitantId && o.dinnerEventId === change.dinnerEventId)

    // Existing order: preserve ticketPriceId. New booking: compute from age.
    const resolvedTicketPriceId = existingOrder?.ticketPriceId ?? ticketPrice?.id
    if (!resolvedTicketPriceId) {
      throw new Error(`Cannot resolve ticketPriceId for inhabitant ${change.inhabitantId}`)
    }

    return {
      inhabitantId: change.inhabitantId,
      dinnerEventId: change.dinnerEventId,
      dinnerMode: change.dinnerMode,
      ticketPriceId: resolvedTicketPriceId,
      isGuestTicket: false,
      orderId: existingOrder?.id,
      state: OrderState.BOOKED
    }
  })

  const result = await bookingsStore.processMultipleEventsBookings(
    household.value.id,
    changedEventIds,
    desiredOrders
  )
  toast.add({
    title: 'Bookinger gemt',
    description: formatScaffoldResult(result.scaffoldResult, 'compact'),
    color: 'success'
  })
}

// Day view save handler - DinnerBookingForm emits DesiredOrder[]
const handleDayViewSave = async (desiredOrders: DesiredOrder[]) => {
  const dinnerEventId = selectedDinnerEvent.value?.id
  if (!dinnerEventId || desiredOrders.length === 0) return

  await bookingsStore.processSingleEventBookings(
    household.value.id,
    dinnerEventId,
    desiredOrders
  )
}

// Grid view guest booking - TODO: implement after day view is done
const handleAddGuest = (eventId: number) => {
  // For now, switch to day view for that event
  const event = dinnerEvents.value.find(e => e.id === eventId)
  if (event) {
    setDate(new Date(event.date))
  }
}
</script>

<template>
  <Loader v-if="isSelectedSeasonLoading" text="Henter sæsondata..." />
  <ViewError v-else-if="isSelectedSeasonErrored" text="Kan ikke hente sæsondata" />
  <div v-else-if="isSelectedSeasonInitialized && selectedSeason" data-testid="household-bookings">
    <!-- Layout: Calendar sidebar for day/week views, full-width for month -->
    <div :class="view === 'month' ? '' : 'grid grid-cols-1 lg:grid-cols-3 gap-6'">
      <!-- Calendar sidebar (day/week views only) -->
      <div v-if="view !== 'month'" class="lg:col-span-1">
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

      <!-- Booking panel (all views) -->
      <div :class="view === 'month' ? '' : 'lg:col-span-2'">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold">Familiens bookinger</h3>
          <BookingViewSwitcher v-model="view" />
        </div>
        <BookingGridView
          v-if="deadlines"
          v-model:form-mode="gridFormMode"
          :view="view"
          :date-range="dateRange"
          :household="household"
          :dinner-events="dinnerEvents"
          :orders="orders"
          :ticket-prices="ticketPrices"
          :deadlines="deadlines"
          :is-saving="isProcessingBookings"
          @save="handleGridSave"
          @navigate="handleNavigate"
          @add-guest="handleAddGuest"
        >
          <!-- Day view content via slot -->
          <template #day-content>
            <DinnerBookingForm
              v-if="selectedDinnerEvent"
              :household="household"
              :dinner-event="selectedDinnerEvent"
              :orders="orders"
              :ticket-prices="ticketPrices"
              :deadlines="deadlines"
              @save-bookings="handleDayViewSave"
            />
            <UAlert
              v-else
              :icon="ICONS.calendar"
              :color="COLOR.neutral"
              variant="soft"
              title="Vælg en dato"
              description="Klik på en dato i kalenderen for at se og redigere bookinger"
            />
          </template>
        </BookingGridView>
      </div>
    </div>
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
