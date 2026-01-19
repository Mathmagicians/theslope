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
import {useQueryParam} from '~/composables/useQueryParam'
import {useDinnerDateParam, BookingViewSchema, type BookingView} from '~/composables/useBookingView'

interface Props {
  household: HouseholdDetail
  canEdit?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  canEdit: true
})
const {household} = toRefs(props)

const {deadlinesForSeason} = useSeason()
const {formatScaffoldResult, BOOKING_TOAST_TITLES} = useBooking()
const {handleApiError} = useApiHandler()
const {ICONS, COLOR} = useTheSlopeDesignSystem()
const toast = useToast()

const planStore = usePlanStore()
const {selectedSeason, isSelectedSeasonInitialized, isSelectedSeasonLoading, isSelectedSeasonErrored} = storeToRefs(planStore)
planStore.initPlanStore()

const bookingsStore = useBookingsStore()
const {orders, isProcessingBookings, lockStatus} = storeToRefs(bookingsStore)

// Allergies store for guest booking form
const allergiesStore = useAllergiesStore()
const {allergyTypes} = storeToRefs(allergiesStore)
allergiesStore.initAllergiesStore()

// Households store for booker ID (current user's inhabitant)
const householdsStore = useHouseholdsStore()
const {myInhabitant} = storeToRefs(householdsStore)
const bookerId = computed(() => myInhabitant.value?.id)

const seasonDates = computed(() => selectedSeason.value?.seasonDates ?? { start: new Date(), end: new Date() })
const dinnerEvents = computed(() => selectedSeason.value?.dinnerEvents ?? [])
const dinnerDates = computed(() => dinnerEvents.value.map(e => new Date(e.date)))
const holidays = computed(() => selectedSeason.value?.holidays ?? [])

// URL-synced view and date (curried pattern)
const syncWhen = () => isSelectedSeasonInitialized.value && dinnerDates.value.length > 0

const {value: view, setValue: setView} = useQueryParam<BookingView>('view', {
  serialize: (v) => v,
  deserialize: (s) => {
    const parsed = BookingViewSchema.safeParse(s)
    return parsed.success ? parsed.data : null
  },
  defaultValue: 'day',
  syncWhen
})

const {value: selectedDate, setValue: setDate} = useDinnerDateParam({
  dinnerDates: () => dinnerDates.value,
  syncWhen
})

// Navigation logic (curried with our refs)
const {dateRange, hasPrev, hasNext, navigate} = useBookingView({
  selectedDate,
  setDate,
  view,
  setView,
  seasonDates: () => selectedSeason.value?.seasonDates ?? null,
  dinnerDates: () => dinnerDates.value
})

// Calendar collapsed by default on mobile
const isMd = inject<Ref<boolean>>('isMd')
const calendarOpen = ref(isMd?.value ?? false)

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
// Pass household.id to fetch orders for the viewed household (not session user's)
watchEffect(() => {
  if (visibleDinnerEventIds.value.length > 0 && household.value?.id) {
    bookingsStore.loadOrdersForDinners(visibleDinnerEventIds.value, !isGridView.value, household.value.id)
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
    title: BOOKING_TOAST_TITLES.grid,
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

// Grid view guest booking - receives DesiredOrder[] from GuestBookingForm (all goes through scaffolder)
const handleAddGuest = async (guestOrders: DesiredOrder[]) => {
  if (guestOrders.length === 0) return

  const eventId = guestOrders[0]?.dinnerEventId
  if (!eventId) return

  const event = dinnerEvents.value.find(e => e.id === eventId)
  const dateStr = event ? formatDate(new Date(event.date)) : ''

  try {
    const result = await bookingsStore.processSingleEventBookings(
      household.value.id,
      eventId,
      guestOrders
    )
    toast.add({
      title: BOOKING_TOAST_TITLES.guest,
      description: `${formatScaffoldResult(result.scaffoldResult)} d. ${dateStr}`,
      color: 'success'
    })
  } catch (e) {
    handleApiError(e, 'handleAddGuest', 'Kunne ikke tilføje gæst')
  }
}
</script>

<template>
  <Loader v-if="isSelectedSeasonLoading" text="Henter sæsondata..." />
  <ViewError v-else-if="isSelectedSeasonErrored" text="Kan ikke hente sæsondata" />
  <div v-else-if="isSelectedSeasonInitialized && selectedSeason" data-testid="household-bookings">
    <!-- Layout: Flex row on desktop, stack on mobile -->
    <div class="flex flex-col md:flex-row gap-6">
      <!-- Calendar sidebar (day/week views only, collapsible) -->
      <div v-if="view !== 'month' && calendarOpen" class="md:basis-1/3">
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

      <!-- Booking panel (grows to fill) -->
      <div class="flex-1">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold">Familiens bookinger</h3>
          <BookingViewSwitcher v-model="view" />
        </div>
        <BookingGridView
          v-if="deadlines"
          v-model:form-mode="gridFormMode"
          v-model:calendar-open="calendarOpen"
          :view="view"
          :date-range="dateRange"
          :can-edit="canEdit"
          :household="household"
          :dinner-events="dinnerEvents"
          :orders="orders"
          :ticket-prices="ticketPrices"
          :deadlines="deadlines"
          :allergy-types="allergyTypes"
          :booker-id="bookerId"
          :is-saving="isProcessingBookings"
          :has-prev="hasPrev"
          :has-next="hasNext"
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
              :released-ticket-count="lockStatus.get(selectedDinnerEvent.id) ?? 0"
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
