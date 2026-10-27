<script setup lang="ts">
/**
 * HouseholdBookings - Booking management (Tilmeldinger tab content)
 *
 * Day and week views with the calendar open: the calendar is the master, the booking panel the detail
 * (LAYOUTS.masterDetailPage). The month view and a closed calendar leave the panel the whole row.
 *
 * md and up                                                 phone
 * +-- a third, at least 245px --+ +-- the rest ----------+  +----------------------------+
 * | DinnerCalendarDisplay       | | Familiens bookinger  |  | DinnerCalendarDisplay      |
 * | one month                   | |               [view] |  +----------------------------+
 * |                             | | BookingGridView      |  | Familiens bookinger [view] |
 * +-----------------------------+ +----------------------+  | BookingGridView            |
 *                                                           +----------------------------+
 */
import type {HouseholdDetail} from '~/composables/useCoreValidation'
import type {DesiredOrder} from '~/composables/useBookingValidation'
import {EMPTY_RELEASED_TICKET_COUNTS, type BookingChanges} from '~/composables/useBooking'
import {BookingViewSchema, type BookingView} from '~/composables/useBookingView'
import {FORM_MODES, type FormMode} from '~/types/form'

interface Props {
  household: HouseholdDetail
  canEdit?: boolean
  adminBypass?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  canEdit: true,
  adminBypass: false
})
const {household} = toRefs(props)

const {deadlinesForSeason, getDinnerOnDate} = useSeason()
const now = useClock()
const {BOOKING_TOAST_TITLES, buildBookingChanges} = useBooking()
const {ICONS, ALERTS, COMPONENTS, LAYOUTS} = useTheSlopeDesignSystem()

const planStore = usePlanStore()
const {selectedSeason, isSelectedSeasonInitialized, isSelectedSeasonLoading, isSelectedSeasonErrored} = storeToRefs(planStore)

const bookingsStore = useBookingsStore()
const {orders, isProcessingBookings, isBookingsReloading, lockStatus, householdWaitlist} = storeToRefs(bookingsStore)

// Allergies store for guest booking form
const allergiesStore = useAllergiesStore()
const {allergyTypes} = storeToRefs(allergiesStore)

// Households store for booker ID (current user's inhabitant)
const householdsStore = useHouseholdsStore()
const {myInhabitant} = storeToRefs(householdsStore)
const bookerId = computed(() => myInhabitant.value?.id)

// Without a season the calendar shows the day of the first render; a fallback that followed the clock would move the view every minute
const today = now.value
const seasonDates = computed(() => selectedSeason.value?.seasonDates ?? { start: today, end: today })
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
  defaultValue: BookingViewSchema.enum.day,
  syncWhen
})

const {value: selectedDate, setValue: setDate} = useDinnerDateParam({
  dinnerDates: () => dinnerDates.value,
  syncWhen
})

// Navigation logic (curried with our refs)
// Season clamping is implicit: dinners outside the season aren't in dinnerDates.
const {dateRange, hasPrev, hasNext, navigate} = useBookingView({
  selectedDate,
  setDate,
  view,
  setView,
  dinnerDates: () => dinnerDates.value
})

const {value: calendarOpen} = useCalendarOpenParam(syncWhen)
const showCalendar = computed(() => view.value !== BookingViewSchema.enum.month && calendarOpen.value)

const handleDateSelected = (date: Date) => setDate(date)
const handleNavigate = (direction: 'prev' | 'next') => navigate(direction === 'next' ? 1 : -1)

// Find dinner event for selected date
const selectedDinnerEvent = computed(() => {
  if (!selectedDate.value) return null
  return getDinnerOnDate(dinnerEvents.value)(selectedDate.value) ?? null
})

// Grid view (week/month) is full-width without calendar
const isGridView = computed(() => view.value === BookingViewSchema.enum.week || view.value === BookingViewSchema.enum.month)

// Visible dinner event IDs based on view and date range (day=1, week=~4, month=~16)
const visibleDinnerEventIds = computed(() =>
  getEventsForGridView(dinnerEvents.value, dateRange.value).flat().map(e => e.id)
)

// Load orders for visible dinner events (grid view doesn't need provenance)
// Pass household.id to fetch orders for the viewed household (not session user's)
bookingsStore.loadOrdersForDinners(() => ({
  dinnerEventIds: household.value?.id ? visibleDinnerEventIds.value : [],
  householdId: household.value?.id,
  includeProvenance: !isGridView.value
}))

// Season data for view components
const ticketPrices = computed(() => selectedSeason.value?.ticketPrices ?? [])
const deadlines = computed(() => selectedSeason.value ? deadlinesForSeason(selectedSeason.value, now.value) : undefined)

// Grid view form mode
const gridFormMode = ref<FormMode>(FORM_MODES.VIEW)

// The order a save's toast names the people in
const householdOrder = computed(() => household.value.inhabitants.map(({id}) => id))

const handleGridSave = async (changes: BookingChanges) => {
  const desiredOrders = buildBookingChanges(changes, orders.value, household.value.inhabitants, dinnerEvents.value, ticketPrices.value)
  if (!selectedSeason.value || desiredOrders.length === 0) return

  // Only process dinner events that have changes (not all visible events!)
  const changedEventIds = [...new Set(desiredOrders.map(o => o.dinnerEventId))]

  await bookingsStore.processMultipleEventsBookings(
    household.value.id,
    changedEventIds,
    desiredOrders,
    props.adminBypass,
    {title: BOOKING_TOAST_TITLES.grid, householdOrder: householdOrder.value}
  )
}

// Day view save handler - DinnerBookingForm emits DesiredOrder[]
const handleDayViewSave = async (desiredOrders: DesiredOrder[]) => {
  const dinnerEventId = selectedDinnerEvent.value?.id
  if (!dinnerEventId || desiredOrders.length === 0) return

  await bookingsStore.processSingleEventBookings(
    household.value.id,
    dinnerEventId,
    desiredOrders,
    props.adminBypass,
    {title: BOOKING_TOAST_TITLES.day, householdOrder: householdOrder.value}
  )
}

// Grid view guest booking - receives DesiredOrder[] from GuestBookingForm (all goes through scaffolder)
const handleAddGuest = async (guestOrders: DesiredOrder[]) => {
  if (guestOrders.length === 0) return

  const eventId = guestOrders[0]?.dinnerEventId
  if (!eventId) return

  const event = dinnerEvents.value.find(e => e.id === eventId)
  const dateStr = event ? formatDate(new Date(event.date)) : ''

  await bookingsStore.processSingleEventBookings(
    household.value.id,
    eventId,
    guestOrders,
    props.adminBypass,
    {title: BOOKING_TOAST_TITLES.guest, suffix: ` d. ${dateStr}`, householdOrder: householdOrder.value}
  )
}
</script>

<template>
  <Loader v-if="isSelectedSeasonLoading" text="Henter sæsondata..." />
  <ViewError v-else-if="isSelectedSeasonErrored" text="Kan ikke hente sæsondata" />
  <div v-else-if="isSelectedSeasonInitialized && selectedSeason" data-testid="household-bookings">
    <!-- Master-detail while the calendar shows; without it the panel holds the row alone -->
    <div :class="showCalendar && LAYOUTS.masterDetailPage.root">
      <!-- Master: the calendar (day/week views only, collapsible) -->
      <div v-if="showCalendar" :class="LAYOUTS.masterDetailPage.left">
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

      <!-- Detail: the booking panel -->
      <div :class="LAYOUTS.masterDetailPage.center">
        <div :class="COMPONENTS.householdBookings.panelHeader">
          <h3 :class="COMPONENTS.householdBookings.panelTitle">Familiens bookinger</h3>
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
          :lock-status="lockStatus"
          :waitlist-entries="householdWaitlist"
          :allergy-types="allergyTypes"
          :booker-id="bookerId"
          :is-saving="isProcessingBookings"
          :loading="isBookingsReloading"
          :has-prev="hasPrev"
          :has-next="hasNext"
          :admin-bypass="adminBypass"
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
              :released-ticket-counts="lockStatus.get(selectedDinnerEvent.id) ?? EMPTY_RELEASED_TICKET_COUNTS"
              :can-edit-admin-override="adminBypass ? () => canEdit : undefined"
              :admin-bypass="adminBypass"
              :waitlist-entries="householdWaitlist"
              :loading="isBookingsReloading"
              @save-bookings="handleDayViewSave"
            />
            <UAlert
              v-else
              v-bind="ALERTS.neutral"
              :icon="ICONS.calendar"
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
    v-bind="ALERTS.info"
    :icon="ICONS.calendar"
    title="Ingen aktiv sæson"
    description="Der er ingen aktiv fællesspisnings sæson i øjeblikket. Kontakt administratoren for at aktivere en sæson."
    data-testid="household-bookings-empty"
  />
</template>
