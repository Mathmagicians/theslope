<script setup lang="ts">
/**
 * DinnerBookingForm - Reusable booking form for a single dinner event
 *
 * Expandable row pattern (like HouseholdCard):
 * - Collapsed: Pure info display (DinnerTicket draws the ticket's own layout)
 * - Expanded: UCard with edit controls + Cancel/Save footer
 *
 * [edit] = BUTTONS.edit, [close] = the turned chevron, [DinnerTicket] = the ticket card,
 * [allergy] = ICONS.allergy, (Gluten) = AllergyTypeDisplay compact show-name
 *
 * PHONE - Collapsed (the ticket under the name):
 * ┌─────────────────────────────────┐
 * │ [edit] Anna B.H.                │
 * │        [claim fra Hansen]       │
 * │ ┌─────────────────────────────┐ │
 * │ │ [DinnerTicket]              │ │
 * │ └─────────────────────────────┘ │
 * └─────────────────────────────────┘
 *
 * PHONE - Expanded:
 * ┌─────────────────────────────────┐
 * │ [close] Anna B.H.               │
 * │ ┌─────────────────────────────┐ │
 * │ │ Vælg spisning for Anna      │ │
 * │ ├─────────────────────────────┤ │
 * │ │ [allergy] (Gluten) (Nødder) │ │  booked inhabitant with allergies only
 * │ │ [booking deadline badge]    │ │
 * │ │ [dining mode deadline badge]│ │
 * │ │ [mode] [mode] [mode] [mode] │ │
 * │ │ [history]                   │ │
 * │ ├─────────────────────────────┤ │
 * │ │ [Annuller]        [Opdater] │ │
 * │ └─────────────────────────────┘ │
 * └─────────────────────────────────┘
 *
 * DESKTOP - Collapsed (the ticket in its own column):
 * ┌───────────────────────────┬──────────────────────────────┐
 * │ [edit] Anna B.H.          │ ┌──────────────────────────┐ │
 * │        [claim fra Hansen] │ │ [DinnerTicket]           │ │
 * │                           │ └──────────────────────────┘ │
 * └───────────────────────────┴──────────────────────────────┘
 *
 * DESKTOP - Expanded:
 * ┌──────────────────────────────────────────────────────────┐
 * │ ┌──────────────────────────────────────────────────────┐ │
 * │ │ Vælg spisning for Anna                               │ │
 * │ ├──────────────────────────────────────────────────────┤ │
 * │ │ [allergy] (Gluten) (Nødder)                          │ │
 * │ │ [booking deadline badge] [dining mode deadline badge]│ │
 * │ │ [mode] [mode] [mode] [mode]                          │ │
 * │ │ [history]                                            │ │
 * │ ├──────────────────────────────────────────────────────┤ │
 * │ │ [Annuller]                                 [Opdater] │ │
 * │ └──────────────────────────────────────────────────────┘ │
 * └──────────────────────────────────────────────────────────┘
 *
 * WHILE THE DINNER'S BOOKINGS LOAD (`loading`, a new dinner or a save's re-read): UTable's loading bar runs under the
 * column headers and the rows stay; the deadline badges stay; the day bill and the household's own notes wait, they
 * count the household's orders:
 *   [booking deadline badge] [dining mode deadline badge]
 *   ======================================================  <- UTable's loading bar
 *   [edit] Hele familien               [DinnerTicket]
 *   [edit] Anna B.H.                   [DinnerTicket]
 *
 * AFTER THE DEADLINE - the household's own notes (ALERTS.warning), each while it counts a ticket, both can show:
 * ┌──────────────────────────────────────────────────────────────────┐
 * │ [released] Husstanden har frigivet 2 billetter                   │
 * │            Du betaler, medmindre andre køber                     │
 * └──────────────────────────────────────────────────────────────────┘
 * ┌──────────────────────────────────────────────────────────────────┐
 * │ [waitlist] Husstanden står på ventelisten med 1 billet           │
 * │            Du betaler, når du får en billet fra ventelisten.     │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * Under them the bar (ALERTS.info) while tickets are for sale or someone waits; with neither, no bar.
 * A dinner can hold both: a released ticket goes only to someone waiting for the same ticket type.
 * [claim] = ICONS.claim while tickets are for sale, [waitlist] = ICONS.waitlist for the waiting list alone,
 * [released] = ICONS.released. The notes read their words from SUPPLY_WORDS, the bar is moreTicketsAlert
 * (useBookingUi), its line the sentence of the Framelding badge's help text.
 *
 * TICKETS FOR SALE:
 * ┌──────────────────────────────────────────────────────────────────┐
 * │ [claim] Har du brug for flere billetter?                         │
 * │         Lukket for framelding: 1 barn til salg                   │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * WAITING LIST:
 * ┌──────────────────────────────────────────────────────────────────┐
 * │ [waitlist] Har du brug for flere billetter?                      │
 * │            Lukket for framelding: 8 voksne på ventelisten        │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * BOTH:
 * ┌──────────────────────────────────────────────────────────────────┐
 * │ [claim] Har du brug for flere billetter?                         │
 * │         Lukket for framelding: 1 barn til salg, 8 voksne på      │
 * │         ventelisten                                              │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * AFTER THE DEADLINE, SOLD OUT - the waiting list (a row without a ticket):
 *   Anna    [  ][  ][  ] [VOKSEN · 55kr]   [mode] Spisesal   [Skriv på venteliste]   picks the mode, then saves
 *   Bo      [wl][  ][  ] [VOKSEN · 55kr]   (mode) Spisesal   [hourglass Voksen #2]    the wish, ghosted
 *   Emil    [  ][  ][  ] [VOKSEN · 55kr]   [mode] Spisesal   (har billet)
 *   (+) GÆST AF Bo  [wl][gu][  ] [BARN · 35kr]   (mode) Spisesal   [hourglass Barn #3]   a queued guest, same marks
 *   (+) Tilføj gæst                                                [Skriv gæst på venteliste]   sold out
 *                                                                  [Køb billet til gæst]        a ticket for sale
 *   ...ticket assigned -> Bo: Spisesal for real (badge gone, a normal order)
 *
 * [wl] the hourglass in the ticket's state cell, [gu] the guest glyph in its guest cell, (mode) the wish ghosted.
 * Placed guest groups and queued guests come from one guest row builder; a queued guest row carries its entry.
 *
 * The collapsed row: DinnerTicket queued (the hourglass, the wish ghosted) and the position badge on the line under
 * the name, the place in the line of the entry's ticket type (createTicketStateBadge through DeadlineBadge). One booking
 * path: the save sends the desired order through the scaffold, which books, buys a ticket for sale or queues by supply.
 * The expanded row previews its save through the server's dry run (ActionPreview under the dinner's day separator, the
 * loader while it works); the save label reads the reply's outcome (bookingSaveLabel over previewSaveOutcome: Book,
 * Køb billet, Skriv på venteliste, Forlad ventelisten, Opdater); a requeue previews "X ændrer spisemåde til Sen
 * (venteliste)". A queued row edits its wish (requeued) or picks Ingen to leave; Tilføj gæst saves the same way.
 * Hele familien reaches the queued rows too: their wishes count in its consensus, and its Ingen leaves every place the
 * household holds on the dinner in the same save as its releases.
 *
 * EXPECTED BOOKINGS - a row without an order or a queue entry shows the booking the preferences give it, read from the
 * dry run with no orders: its ticket reads as a queued one with the sliders [ex] in place of the hourglass, the mode
 * ghosted on neutral (DinnerTicket expected, COMPONENTS.bookingGrid.expectedBadge); a person the run leaves out reads
 * Ingen. The power row takes the consensus of the modes the rows show and is expected while every inhabitant row is.
 * The legend always lists "Forventet bestilling ifølge præferencer"; the table's loading bar runs while the read loads:
 *   Hele familien  [  ][  ][  ] [ALLE]            [mixed] Blandet    Anna expected, Bo not: the mix of what the rows show
 *   Anna           [ex][  ][  ] [VOKSEN · 55kr]   (mode) Takeaway    expected, ghosted
 *   Bo             [  ][  ][  ] [VOKSEN · 55kr]   [mode] Ingen       cancelled earlier: not expected
 * every inhabitant row expected:
 *   Hele familien  [ex][  ][  ] [ALLE]            (mode) Takeaway    the power row ghosted too
 * The plan stays a ghost until it is touched: the expanded row's selector selects no button and hints the plan's
 * (COMPONENTS.dinnerModeSelector.plannedButton), with no preview; a click adopts the clicked mode as the person's
 * intent, and the ticket turns solid on it. Solid is a booking or an intent, never a plan:
 *   Anna  [ex][  ][  ] [VOKSEN · 55kr]   (mode) Takeaway    expanded: [  ][  ](mode)[  ]   untouched, Opdater sends nothing
 *   Anna  [  ][  ][  ] [VOKSEN · 55kr]   [mode] Takeaway    after a click on (mode): Takeaway booked on save, bare
 * The power row with every row expected hints its mode the same way; a click on it adopts each person's plan, another
 * mode goes to every row.
 *
 * ON A CANCELLED DINNER - the cancelled corner ribbon (getRibbonClasses('cancel'), COMPONENTS.ribbon) over the form's
 * top right corner, and every row's ticket on the cancelled face (DinnerTicket cancelled). As on a past dinner the form
 * offers no edit: no row carries the edit button, and the add-guest row and the legend stay away. A parent
 * that draws the ribbon itself passes `ribbon` false (/dinner, where the form sits inside ChefMenuCard):
 * ┌────────────────────────────────────────────────────────╲ AFLYST ╲┐
 * │ [booking deadline badge] [dining mode deadline badge]   2V · 110 │
 * │ Hele familien     -[DinnerTicket]-                               │
 * │ Anna B.H.         -[DinnerTicket]-                               │  -[..]- the past day's colours, struck through
 * └──────────────────────────────────────────────────────────────────┘
 */
import type {HouseholdDetail, InhabitantDisplay} from '~/composables/useCoreValidation'
import type {DinnerEventDisplay, OrderDisplay, DinnerMode, DesiredOrder, ScaffoldOrdersRequest, TicketState as TicketStateValue} from '~/composables/useBookingValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import type {AllergyTypeDisplay} from '~/composables/useAllergyValidation'
import type {SeasonDeadlines} from '~/composables/useSeason'
import type {DeadlineBadgeData, TicketPresentation} from '~/composables/useBookingUi'
import {EMPTY_RELEASED_TICKET_COUNTS, bookingContextOf, type ReleasedTicketCounts} from '~/composables/useBooking'
import type {TicketWaitlistDetail} from '~/composables/useWaitlistValidation'
import {BookingRowTypeSchema, type BookingRowType} from '~/composables/useBookingView'
import {FORM_MODES} from '~/types/form'
import {BOOKING_WORDS} from '~/config/bookingWords'
import {compareAsc, isSameDay} from 'date-fns'

const BookingRow = BookingRowTypeSchema.enum

interface TableRow {
  rowType: BookingRowType
  id: number | string
  name: string
  lastName: string
  birthDate?: Date | null
  inhabitant?: InhabitantDisplay // For UserListItem in single mode
  inhabitants?: InhabitantDisplay[] // For UserListItem in group mode (power)
  ticketConfig: TicketPresentation | null
  order: OrderDisplay | null
  orders?: OrderDisplay[] // For grouped guest orders
  dinnerMode: DinnerMode
  enabledModes: DinnerMode[] // The modes the row may pick (getBookingOptions); none: the row is read-only
  waitlistEntry?: TicketWaitlistDetail // The inhabitant's own place in the queue, while they hold no ticket
  expected?: boolean // No order and no queue entry: the mode is the booking the preferences give the row
  consensus?: boolean // Power mode: true=all agree, false=mixed
  price: number
  ticketPriceId: number | null // Nullable: TicketPrice may be deleted (priceAtBooking preserved)
  guestCount?: number // undefined = not guest, 1+ = guest ticket(s)
  provenanceHousehold?: string
  ticketState: TicketStateValue // What the row's ticket is now: released, bought, queued for, or normal
  stateBadge: DeadlineBadgeData | null // The ticket state's badge: beside the name, a queued one on the line under it
  birthdayBadge: DeadlineBadgeData | null // A person's first dinner at a new ticket type, beside the name
  allergyTypes: AllergyTypeDisplay[] // The booked inhabitant's live allergy profile; empty for every other row
}

// The parts of a row its save reads
type SavedRow = Pick<TableRow, 'rowType' | 'id' | 'order' | 'orders' | 'waitlistEntry'>

interface Props {
  household?: HouseholdDetail
  dinnerEvent: DinnerEventDisplay
  orders?: OrderDisplay[]
  ticketPrices?: TicketPrice[]
  /** Deadline predicates - parent can wrap with () => true for admin mode to bypass deadline checks */
  deadlines: SeasonDeadlines
  releasedTicketCounts?: ReleasedTicketCounts
  /** Admin override for edit permission - bypasses the auth store isMemberOfHousehold check when provided */
  canEditAdminOverride?: () => boolean
  /** The household's queue entries with their positions (a closed, sold-out dinner) */
  waitlistEntries?: TicketWaitlistDetail[]
  /** The dinner's bookings are on the way */
  loading?: boolean
  /** An admin's save lifts the deadlines (ADR-016): its preview reads the same run */
  adminBypass?: boolean
  /** Draws the cancelled corner ribbon on a cancelled dinner; a parent that draws its own passes false */
  ribbon?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  household: undefined,
  orders: () => [],
  ticketPrices: () => [],
  releasedTicketCounts: () => EMPTY_RELEASED_TICKET_COUNTS,
  canEditAdminOverride: undefined,
  waitlistEntries: () => [],
  loading: false,
  adminBypass: false,
  ribbon: true
})

const emit = defineEmits<{
  saveBookings: [orders: DesiredOrder[]]
  cancel: []
}>()

// Self-initialize household store
const householdsStore = useHouseholdsStore()
const {selectedHousehold} = storeToRefs(householdsStore)
const household = computed(() => props.household ?? selectedHousehold.value)

// Permission-based form mode - EDIT if the user belongs to the household (session predicate on the auth store, ADR-017)
// Admin can override via canEditAdminOverride prop
const {isMemberOfHousehold} = useAuthStore()
const formMode = computed(() => {
  const householdId = household.value?.id
  const canEdit = householdId && (props.canEditAdminOverride ?? (() => isMemberOfHousehold(householdId)))()
  return canEdit ? FORM_MODES.EDIT : FORM_MODES.VIEW
})

const {COMPONENTS, SIZES, COLOR, ICONS, BUTTONS, ALERTS, getRandomEmptyMessage, getResidencyDisplay, LAYOUTS, NOISE, TYPOGRAPHY, TABLE_COLUMNS, ORIENTATIONS} = useTheSlopeDesignSystem()
const emptyStateMessage = getRandomEmptyMessage('household')

const {findTicketPriceById, resolveTicketPrice, resolveTicketPriceOn, ticketTypeChangeOf, formatPrice} = useTicket()

// The season's dinners give a person's first dinner at a new ticket type; the badge shows when that is this dinner
const planStore = usePlanStore()
const seasonDinnerDates = computed(() => (planStore.selectedSeason?.dinnerEvents ?? []).map(dinner => dinner.date).sort(compareAsc))
const birthdayBadgeOf = (inhabitant: InhabitantDisplay): DeadlineBadgeData | null => {
  const change = ticketTypeChangeOf(inhabitant.birthDate, props.ticketPrices)(seasonDinnerDates.value)
  return change && isSameDay(change.date, props.dinnerEvent.date) ? createBirthdayBadge(change.ticketType, change.date) : null
}
const {getReleasedOrders} = useOrder()

const {isDinnerPast} = useSeason()
const {canModifyOrders} = props.deadlines

const {DinnerModeSchema, OrderStateSchema, BookingActionSchema, DinnerStateSchema} = useBookingValidation()
const DinnerModeEnum = DinnerModeSchema.enum
const OrderStateEnum = OrderStateSchema.enum

// Allergies store for guest allergy selection
const allergiesStore = useAllergiesStore()
const {allergyTypes} = storeToRefs(allergiesStore)

// ============================================================================
// EXPANDABLE ROW STATE
// ============================================================================

// Draft state for editing: null while the expanded row is an untouched plan
const draftMode = ref<DinnerMode | null>(null)
const editingRowId = ref<number | string | null>(null)
const isSaving = ref(false)

// Single history visible at a time
const historyOrderId = ref<number | null>(null)
const toggleHistory = (orderId: number | null) => {
    historyOrderId.value = historyOrderId.value === orderId ? null : orderId
}

const {expanded} = useExpandableRow({
  onExpand: (rowId) => {
    const row = tableData.value.find(candidate => rowIdOf(candidate) === rowId)
    if (row) {
      editingRowId.value = row.id
      // A plan's draft starts on the person's click; a row without a ticket shows Ingen, its draft starts on the first mode it may pick
      draftMode.value = row.expected ? null : row.enabledModes.includes(row.dinnerMode) ? row.dinnerMode : row.enabledModes[0] ?? row.dinnerMode
    }
    historyOrderId.value = null
  },
  onCollapse: () => {
    editingRowId.value = null
    historyOrderId.value = null
  }
})

// ============================================================================
// DEADLINE COMPUTEDS
// ============================================================================

const canBook = computed(() => canModifyOrders(props.dinnerEvent.date))
const dinnerHasPassed = computed(() => isDinnerPast(props.dinnerEvent.date))
// Nothing lands on a cancelled dinner: the form wears the corner ribbon, and every ticket the cancelled face
const isCancelled = computed(() => props.dinnerEvent.state === DinnerStateSchema.enum.CANCELLED)
const showRibbon = computed(() => props.ribbon && isCancelled.value)
// Edit allowed if: permission-based formMode is EDIT AND the dinner has neither passed nor been cancelled
// A row opens while the member may change the household and the booking rules give the row a mode (ADR-016)
const canOpenRow = (row: TableRow): boolean => formMode.value === FORM_MODES.EDIT && row.enabledModes.length > 0

const bookingContext = computed(() => bookingContextOf(household.value, props.deadlines, props.ticketPrices)(props.dinnerEvent))
const isHouseholdInResidency = computed(() => bookingContext.value.isHouseholdInResidency(props.dinnerEvent.date))

const residencyAlert = computed(() => {
  if (isHouseholdInResidency.value || !household.value) return null
  return getResidencyDisplay(household.value.movedInDate, household.value.moveOutDate)
})

// ============================================================================
// ORDER PARTITIONING (uses useBooking helpers)
// ============================================================================

const eventOrders = computed(() =>
  (props.orders ?? []).filter(o => o.dinnerEventId === props.dinnerEvent.id)
)
const eventWaitlistEntries = computed(() => props.waitlistEntries.filter(entry => entry.dinnerEventId === props.dinnerEvent.id))

// The bookings the scaffold will make on this dinner: its dry run with no orders, read again once the orders change
const bookingsStore = useBookingsStore()
const householdOrder = computed(() => household.value?.inhabitants.map(({id}) => id) ?? [])
// Every viewer reads them, on the season's deadlines
const expectedRequest = computed(() => household.value && !dinnerHasPassed.value
  ? {householdId: household.value.id, dinnerEventIds: [props.dinnerEvent.id]}
  : null)
const {result: expectedRun, pending: isExpectedPending} = useScaffoldPreview(
  () => expectedRequest.value,
  ({householdId, dinnerEventIds}) => bookingsStore.fetchExpectedBookings(householdId, dinnerEventIds),
  {refreshOn: [() => props.orders]}
)
const expectedModes = computed(() => expectedBookings(expectedRun.value))
// A row without an order or a queue entry shows the booking the preferences give it
const expectedModeOf = (inhabitantId: number): DinnerMode | undefined =>
  findRegularOrder(eventOrders.value, inhabitantId, props.dinnerEvent.id) || findRegularOrder(eventWaitlistEntries.value, inhabitantId, props.dinnerEvent.id)
    ? undefined
    : expectedModes.value.get(expectedBookingKey(inhabitantId, props.dinnerEvent.id))

// The household's own notes on a closed dinner: the tickets it released and its places on the waiting list
const householdReleasedTickets = computed(() => getReleasedOrders(eventOrders.value))
const householdReleasedNote = computed(() =>
  householdReleasedTickets.value.length > 0 ? SUPPLY_WORDS.householdReleased(householdReleasedTickets.value.length) : null)
const householdQueuedNote = computed(() =>
  eventWaitlistEntries.value.length > 0 ? SUPPLY_WORDS.householdQueued(eventWaitlistEntries.value.length) : null)
// The bar on a closed dinner while tickets are for sale or someone waits, and the add-guest row's tickets for sale
const moreTickets = computed(() => moreTicketsAlert(props.releasedTicketCounts))
const forSaleWords = computed(() => ticketsForSale(props.releasedTicketCounts))

// ============================================================================
// TABLE CONFIGURATION
// ============================================================================

const columns = computed(() => [
  {id: 'expand'},
  {id: 'name', ...TABLE_COLUMNS.bookingFormName},
  {id: 'ticket', ...TABLE_COLUMNS.bookingFormTicket}  // No header - the ticket sits under the name on a phone
])

// Booker for guest tickets: current user's inhabitant (for regular booking flow)
const {myInhabitant: bookerInhabitant} = storeToRefs(householdsStore)

// The modes a row may pick: the desired order its save sends for each mode, as the decision matrix lands it
const enabledModesOf = (row: SavedRow): DinnerMode[] => getBookingOptions({
  order: row.order,
  waitlistEntry: row.waitlistEntry ?? null,
  candidate: dinnerMode => buildDesiredOrdersForRow(row, dinnerMode)[0] ?? null
}, bookingContext.value)

const newGuestModes = computed(() =>
  getBookingOptions(newGuestRow(bookerInhabitant.value?.id, props.dinnerEvent.id, props.ticketPrices), bookingContext.value))

const tableData = computed((): TableRow[] => {
  if (!household.value?.inhabitants) return []

  const allInhabitants = household.value.inhabitants

  const inhabitantRows: TableRow[] = allInhabitants.map(inhabitant => {
    const order = findRegularOrder(eventOrders.value, inhabitant.id, props.dinnerEvent.id) ?? null
    // An order supersedes a queue entry: the assignment deletes the entry it placed
    const waitlistEntry = order ? undefined : findRegularOrder(eventWaitlistEntries.value, inhabitant.id, props.dinnerEvent.id)
    const expectedMode = expectedModeOf(inhabitant.id)

    const ticketPrice = resolveTicketPriceOn(inhabitant.birthDate ?? null, order, props.ticketPrices, props.dinnerEvent.date)

    const row = {
      rowType: BookingRow.inhabitant,
      id: inhabitant.id,
      name: inhabitant.name,
      lastName: inhabitant.lastName,
      birthDate: inhabitant.birthDate,
      inhabitant,
      ticketConfig: ticketPricePresentation(ticketPrice),
      order,
      waitlistEntry,
      expected: expectedMode !== undefined,
      dinnerMode: order?.dinnerMode ?? waitlistEntry?.order.dinnerMode ?? expectedMode ?? DinnerModeEnum.NONE,
      price: order?.priceAtBooking ?? ticketPrice?.price ?? 0,
      ticketPriceId: order?.ticketPriceId ?? ticketPrice?.id ?? null,
      provenanceHousehold: order?.provenanceHousehold,
      ...ticketStateOfRow(order, waitlistEntry),
      birthdayBadge: birthdayBadgeOf(inhabitant),
      allergyTypes: order ? (inhabitant.allergies ?? []).map(allergy => allergy.allergyType) : []
    }
    return {...row, enabledModes: enabledModesOf(row)}
  })

  // A guest row is a placed group (booker, ticket type, price, dinner) or one queued guest: the same row, booked or queued
  type GuestItem = {id: string, orders: OrderDisplay[], waitlistEntry?: TicketWaitlistDetail}
  const placedGuests: GuestItem[] = Object.entries(groupGuestOrders(eventOrders.value))
    .filter(([, orders]) => orders.length > 0)
    .map(([key, orders]) => ({id: `guest-group-${key}`, orders}))
  const queuedGuests: GuestItem[] = eventWaitlistEntries.value
    .filter(entry => entry.isGuestTicket)
    .map(waitlistEntry => ({id: `guest-entry-${waitlistEntry.id}`, orders: [], waitlistEntry}))

  const guestOrderRows: TableRow[] = [...placedGuests, ...queuedGuests].map(({id, orders, waitlistEntry}) => {
    const firstOrder = orders[0] ?? null
    const held = firstOrder ?? waitlistEntry!.order
    const booker = allInhabitants.find(i => i.id === held.inhabitantId)

    // A guest has no birthDate: the price the order or the entry holds names the ticket type
    const resolvedTicketPrice = waitlistEntry
      ? findTicketPriceById(waitlistEntry.order.ticketPriceId, props.ticketPrices)
      : resolveTicketPrice(null, held.priceAtBooking, props.ticketPrices)

    const row = {
      rowType: BookingRow['guest-order'],
      id,
      name: BOOKING_WORDS.guests.name,
      lastName: '',
      inhabitant: booker,
      ticketConfig: ticketPricePresentation(resolvedTicketPrice),
      order: firstOrder,
      orders,
      waitlistEntry,
      dinnerMode: held.dinnerMode,
      price: held.priceAtBooking ?? 0,
      ticketPriceId: held.ticketPriceId ?? resolvedTicketPrice?.id ?? null,
      guestCount: Math.max(orders.length, 1),
      provenanceHousehold: firstOrder?.provenanceHousehold,
      ...ticketStateOfRow(firstOrder, waitlistEntry),
      birthdayBadge: null,
      allergyTypes: []
    }
    return {...row, enabledModes: enabledModesOf(row)}
  })

  // The consensus of the modes the rows show: an expected row counts its expected mode
  const {value: consensusMode, consensus: hasConsensus} = getPowerConsensus(allInhabitants.map(i => i.id), eventOrders.value, eventWaitlistEntries.value, props.dinnerEvent.id, {
    inhabitant: expectedModeOf
  })

  // Default synthetic row template
  const defaultSyntheticRow = {
    lastName: '',
    ticketConfig: null,
    order: null,
    price: 0,
    ticketPriceId: 0,
    ticketState: TicketState.normal,
    stateBadge: null,
    birthdayBadge: null,
    allergyTypes: [] as AllergyTypeDisplay[]
  }

  // Power row with consensus (shown in both VIEW and EDIT modes): the modes every inhabitant row may pick
  const powerRow: TableRow = {
    ...defaultSyntheticRow,
    rowType: BookingRow.power,
    id: 'power-mode',
    name: 'Hele familien',
    inhabitants: allInhabitants,
    ticketConfig: COMPONENTS.powerMode.ticketConfig,
    dinnerMode: consensusMode,
    enabledModes: powerOptions(inhabitantRows.map(row => row.enabledModes)),
    consensus: hasConsensus,
    expected: inhabitantRows.length > 0 && inhabitantRows.every(row => row.expected)
  }

  // VIEW mode: power + inhabitants + guest orders
  if (formMode.value !== FORM_MODES.EDIT || newGuestModes.value.length === 0) return [powerRow, ...inhabitantRows, ...guestOrderRows]

  // EDIT mode: power + inhabitants + guest orders + add guest
  // Synthetic inhabitant for UserListItem consistency
  const guestAddInhabitant = {
    id: 0,
    name: 'Tilføj gæst',
    lastName: '',
    heynaboId: 0,
    pictureUrl: null,
    birthDate: null,
    householdId: 0,
    dinnerPreferences: null
  } as InhabitantDisplay

  return [
    powerRow,
    ...inhabitantRows,
    ...guestOrderRows,
    {...defaultSyntheticRow, rowType: BookingRow['guest-add'], id: 'guest', name: 'Tilføj gæst', inhabitant: guestAddInhabitant, dinnerMode: DinnerModeEnum.DINEIN, enabledModes: newGuestModes.value}
  ]
})

// ============================================================================
// HANDLERS
// ============================================================================

// Build desired orders for a row in a mode (DRY: the save, its preview and the row's modes)
const buildDesiredOrdersForRow = (row: SavedRow, dinnerMode: DinnerMode): DesiredOrder[] => {
  const dinnerEventId = props.dinnerEvent.id
  const buildForInhabitants = (inhabitantIds: number[]) => buildDesiredOrders(
    inhabitantIds.map(inhabitantId => ({inhabitantId, dinnerEventId, dinnerMode})),
    eventOrders.value,
    household.value?.inhabitants ?? [],
    [props.dinnerEvent],
    props.ticketPrices
  )

  if (row.rowType === BookingRow.power) {
    const inhabitantIds = (household.value?.inhabitants ?? []).map(i => i.id)
    return buildBookingChanges(
      getPowerChanges(inhabitantIds, eventOrders.value, eventWaitlistEntries.value, dinnerEventId, dinnerMode),
      eventOrders.value,
      household.value?.inhabitants ?? [],
      [props.dinnerEvent],
      props.ticketPrices
    )
  }

  if (row.rowType === BookingRow['guest-order'] && row.waitlistEntry) {
    // A queued guest names its entry: Ingen leaves the queue, another mode requeues the wish at the held price
    return [buildEntryDesiredOrder({entry: row.waitlistEntry, dinnerMode}, OrderStateEnum.BOOKED)]
  }

  if (row.rowType === BookingRow['guest-order']) {
    const guestOrders = row.orders ?? (row.order ? [row.order] : [])
    return buildGuestDesiredOrders([{guestOrders, dinnerMode}], props.ticketPrices)
  }

  if (row.rowType === BookingRow.inhabitant && typeof row.id === 'number') {
    // A queued row names its entry: Ingen leaves the queue, another mode requeues the wish
    const waitlistEntryId = row.waitlistEntry?.id
    return buildForInhabitants([row.id]).map(order => waitlistEntryId ? {...order, waitlistEntryId} : order)
  }

  return []
}

// The expanded row's draft; null while it is an untouched plan
const draftOf = (row: TableRow): DinnerMode | null => editingRowId.value === row.id ? draftMode.value : null
// A plan stays a ghost until its row is touched; once touched the ticket shows the person's intent, solid
const isPlan = (row: TableRow): boolean => !!row.expected && draftOf(row) === null
const ticketModeOf = (row: TableRow): DinnerMode => (row.expected ? draftOf(row) : null) ?? row.dinnerMode

// What the expanded row's save sends: nothing for an untouched plan; the planned power row's shown mode adopts each person's plan
const draftOrdersOf = (row: TableRow): DesiredOrder[] => {
  const dinnerMode = draftOf(row)
  if (dinnerMode === null) return []
  if (row.rowType !== BookingRow.power || !row.expected || dinnerMode !== row.dinnerMode) return buildDesiredOrdersForRow(row, dinnerMode)
  const inhabitants = household.value?.inhabitants ?? []
  const plans = inhabitants.flatMap(({id}) => {
    const plan = expectedModeOf(id)
    return plan ? [{inhabitantId: id, dinnerEventId: props.dinnerEvent.id, dinnerMode: plan}] : []
  })
  return buildDesiredOrders(plans, eventOrders.value, inhabitants, [props.dinnerEvent], props.ticketPrices)
}

const handleSave = async (row: TableRow) => {
  isSaving.value = true

  try {
    // Validate before building orders
    if (row.rowType === BookingRow.power) {
      const inhabitantRows = tableData.value.filter((r: TableRow) => r.rowType === BookingRow.inhabitant)
      const missingPrice = inhabitantRows.find(r => r.ticketPriceId === null)
      if (missingPrice) {
        throw new Error(`Kan ikke booke: mangler billetpris for ${missingPrice.name}`)
      }
    } else if (!row.ticketPriceId) {
      throw new Error(row.rowType === BookingRow['guest-order']
        ? 'Kan ikke booke: mangler billetpris for gæst'
        : `Kan ikke booke: mangler billetpris for ${row.name}`)
    }

    const orders = draftOrdersOf(row)

    if (orders.length > 0) {
      completeBooking(orders)
    } else {
      expanded.value = {}
    }
  } finally {
    isSaving.value = false
  }
}

const handleCancel = () => {
  expanded.value = {}
  emit('cancel')
}

// Shared: emit orders and collapse row
const completeBooking = (orders: DesiredOrder[]) => {
  emit('saveBookings', orders)
  expanded.value = {}
}

// GuestBookingForm emits ready-made orders, forward to shared function
const handleGuestSave = (orders: DesiredOrder[]) => completeBooking(orders)

// ============================================================================
// HELPER TEXT
// ============================================================================

const {groupGuestOrders, getBookingOptions, powerOptions, newGuestRow, getDayBillSummary, buildDesiredOrders, buildGuestDesiredOrders, buildBookingChanges, getPowerChanges, getPowerConsensus} = useBooking()
const {createBookingBadges, createTicketStateBadge, createBirthdayBadge, bookingSaveLabel} = useBookingUi()

// A queue entry's place names the line of the ticket type its price holds
const ticketTypeOfEntry = computed(() => useWaitlist().ticketTypeOfEntry(props.ticketPrices))

// A row's ticket state and its badge, which reads the place in the line of a queued ticket and the seller of a bought one
const ticketStateOfRow = (order: OrderDisplay | null, waitlistEntry?: TicketWaitlistDetail) => {
  const ticketState = ticketStateOf(order, !!waitlistEntry)
  const detail = waitlistEntry ? formatPlace(waitlistEntry.position, ticketTypeOfEntry.value(waitlistEntry)) : order?.provenanceHousehold
  return {ticketState, stateBadge: createTicketStateBadge(ticketState, detail)}
}

// Deadline badges
const badges = computed(() => createBookingBadges(props.dinnerEvent, props.deadlines, props.releasedTicketCounts))

// Day bill summary (ticket counts + total price)
const dayBillSummary = computed(() => getDayBillSummary(eventOrders.value))

// What saving the expanded row does: the server's dry run of its desired orders feeds the preview and the save label
const previewRequest = computed((): ScaffoldOrdersRequest | null => {
  const row = tableData.value.find(r => r.id === editingRowId.value)
  // The add-guest row previews in GuestBookingForm
  if (!row || row.rowType === BookingRow['guest-add'] || !household.value) return null
  const orders = draftOrdersOf(row)
  return orders.length > 0 ? {householdId: household.value.id, dinnerEventIds: [props.dinnerEvent.id], orders} : null
})
const {result: preview, pending: isPreviewPending} = useScaffoldPreview(
  () => previewRequest.value,
  request => bookingsStore.previewBookings(request, props.adminBypass)
)
const previewDays = computed(() => preview.value ? formatPreviewLines(preview.value, householdOrder.value) : [])
const saveLabel = computed(() => bookingSaveLabel(preview.value ? previewSaveOutcome(preview.value) : BookingActionSchema.enum.CHANGE_MODE))
</script>

<template>
  <UAlert
    v-if="residencyAlert"
    v-bind="ALERTS[residencyAlert.color]"
    :icon="residencyAlert.icon"
    :title="residencyAlert.alertTitle"
    :description="residencyAlert.alertDescription"
    data-testid="outside-residency-alert"
  />

  <UAlert
    v-else-if="!household?.inhabitants?.length"
    v-bind="ALERTS.emptyState"
    :avatar="{text: emptyStateMessage.emoji, size: SIZES.emptyStateAvatar}"
  >
    <template #title>{{ emptyStateMessage.text }}</template>
    <template #description>Ingen husstandsmedlemmer fundet</template>
  </UAlert>

  <!-- Booking form -->
  <div v-else :class="[COMPONENTS.bookingForm.root, showRibbon && COMPONENTS.ribbon.container]">
    <!-- Cancelled ribbon -->
    <div
      v-if="showRibbon"
      :class="getRibbonClasses('cancel')"
      data-testid="cancelled-ribbon"
    >
      {{ BOOKING_WORDS.cancelledDinner.ribbon }}
    </div>

    <!-- Deadline Status Badges + Day Bill Summary -->
    <!-- Mobile: badges stacked left, day bill right | Desktop: all in row with gaps -->
    <div :class="COMPONENTS.bookingForm.statusRow">
      <div :class="COMPONENTS.bookingForm.deadlineBadges">
        <DeadlineBadge :badge="badges.booking" />
        <DeadlineBadge :badge="badges.diningMode" />
      </div>
      <div v-if="!loading" :class="COMPONENTS.bookingForm.dayBill" data-testid="booking-day-bill">
        <span :class="TYPOGRAPHY.cardTitle">{{ dayBillSummary.ticketCounts }} · {{ formatPrice(dayBillSummary.totalPrice) }} kr</span>
      </div>
    </div>

    <!-- The household's own notes and the supply bar -->
    <div v-if="!canBook" :class="COMPONENTS.bookingForm.releasedAlerts">
      <UAlert
        v-if="householdReleasedNote && !loading"
        v-bind="ALERTS.warning"
        :icon="ICONS.released"
        :title="householdReleasedNote.title"
        :description="householdReleasedNote.description"
      />
      <UAlert
        v-if="householdQueuedNote && !loading"
        v-bind="ALERTS.warning"
        :icon="ICONS.waitlist"
        :title="householdQueuedNote.title"
        :description="householdQueuedNote.description"
        data-testid="household-waitlist-alert"
      />
      <UAlert
        v-if="moreTickets"
        v-bind="ALERTS.info"
        :icon="moreTickets.icon"
        :title="moreTickets.title"
        :description="moreTickets.description"
        data-testid="more-tickets-alert"
      />
    </div>

    <!-- Main Table with Expandable Rows -->
    <UTable
      v-model:expanded="expanded"
      :data="tableData"
      :columns="columns"
      :loading="loading || isExpectedPending"
      :get-row-id="rowIdOf"
      data-testid="booking-table"
      :ui="COMPONENTS.table.bookingUi"
    >
      <!-- Expand button column - uses BUTTONS.edit for standardized sizing -->
      <template #expand-cell="{row}">
        <UButton
          v-if="canOpenRow(row.original)"
          v-bind="BUTTONS.edit"
          :icon="row.getIsExpanded() ? ICONS.chevronDown : (row.original.rowType === BookingRow.power ? COMPONENTS.powerMode.buttonIcon : (row.original.rowType === BookingRow['guest-add'] ? ICONS.plusCircle : BUTTONS.edit.icon))"
          :aria-label="row.getIsExpanded() ? 'Luk' : 'Rediger'"
          :data-testid="`${row.original.rowType}-${row.original.id}-toggle`"
          :class="[COMPONENTS.openTurn(row.getIsExpanded()), row.original.rowType === BookingRow.power && !row.getIsExpanded() && COMPONENTS.bookingForm.powerToggleIdle]"
          @click="row.toggleExpanded()"
        />
      </template>

      <!-- Name Column -->
      <template #name-cell="{row}">
        <div :class="COMPONENTS.bookingForm.nameCell">
          <!-- Power Mode Row - UserListItem in GROUP mode with ticket below -->
          <div v-if="row.original.rowType === BookingRow.power && row.original.inhabitants" :class="COMPONENTS.bookingForm.powerName">
            <UserListItem
              :inhabitants="row.original.inhabitants"
              :show-names="false"
              :link-to-profile="false"
              :max="COMPONENTS.avatar.powerRowMax"
              compact
              label="beboere"
            />
            <!-- DinnerTicket for power row (mobile only - desktop in ticket-cell) -->
            <div :class="COMPONENTS.bookingForm.ticketPhone">
              <DinnerTicket
                :ticket-config="row.original.ticketConfig"
                :price="row.original.price"
                :dinner-mode="ticketModeOf(row.original)"
                :consensus="row.original.consensus"
                :expected="isPlan(row.original)"
                :cancelled="isCancelled"
              />
            </div>
          </div>

          <!-- Guest Add Row - UserListItem with synthetic inhabitant -->
          <div v-else-if="row.original.rowType === BookingRow['guest-add'] && row.original.inhabitant">
            <UserListItem
              :inhabitants="row.original.inhabitant"
              :link-to-profile="false"
              :icon="ICONS.userPlus"
              compact
            >
              <template #badge>
                <UBadge v-if="forSaleWords" :color="COLOR.info" :icon="ICONS.claim" :variant="NOISE.subtle" :size="SIZES.small">
                  {{ forSaleWords }}
                </UBadge>
              </template>
            </UserListItem>
          </div>

          <!-- Inhabitant Row - UserListItem in SINGLE mode -->
          <div v-else-if="row.original.rowType === BookingRow.inhabitant && row.original.inhabitant">
            <UserListItem
              :inhabitants="row.original.inhabitant"
              :link-to-profile="false"
              compact
            >
              <template #badge>
                <DeadlineBadge v-if="row.original.stateBadge && !row.original.waitlistEntry" :badge="row.original.stateBadge" compact :data-testid="`${row.original.rowType}-${row.original.id}-state`" />
                <DeadlineBadge v-if="row.original.birthdayBadge" :badge="row.original.birthdayBadge" compact :data-testid="`${row.original.rowType}-${row.original.id}-birthday`" />
              </template>
            </UserListItem>
          </div>

          <!-- Guest Order Row - show who invited using UserListItem -->
          <div v-else-if="row.original.rowType === BookingRow['guest-order']">
            <div :class="COMPONENTS.bookingForm.guestOf">
              <UAvatar :icon="ICONS.userPlus" :size="COMPONENTS.avatar.compact.size" :class="COMPONENTS.avatar.compact.fit" />
              <span :class="COMPONENTS.bookingForm.guestOfLabel">{{ BOOKING_WORDS.guests.of }}</span>
              <UserListItem
                v-if="row.original.inhabitant"
                :inhabitants="row.original.inhabitant"
                :link-to-profile="false"
                compact
                :show-names="true"
              />
              <span v-else :class="TYPOGRAPHY.bodyTextSmall">ukendt</span>
            </div>
            <!-- A released or bought ticket's badge, as on an inhabitant's row -->
            <div v-if="row.original.stateBadge && !row.original.waitlistEntry" :class="COMPONENTS.bookingForm.guestProvenance">
              <DeadlineBadge :badge="row.original.stateBadge" compact :data-testid="`${row.original.rowType}-${row.original.id}-state`" />
            </div>
          </div>

          <!-- Queue position of an inhabitant or a guest: the ticket state's badge, on the line under the name -->
          <div v-if="row.original.waitlistEntry && row.original.stateBadge" :class="COMPONENTS.bookingForm.guestProvenance" :data-testid="`waitlist-position-${row.original.id}`">
            <DeadlineBadge :badge="row.original.stateBadge" compact />
          </div>

          <!-- Mobile: Ticket inline (for inhabitant/guest-order rows only) -->
          <div v-if="row.original.rowType === BookingRow.inhabitant || row.original.rowType === BookingRow['guest-order']" :class="COMPONENTS.bookingForm.ticketPhone">
            <DinnerTicket
              :ticket-config="row.original.ticketConfig"
              :price="row.original.price"
              :dinner-mode="ticketModeOf(row.original)"
              :ticket-state="row.original.ticketState"
              :expected="isPlan(row.original)"
              :cancelled="isCancelled"
              :guest-count="row.original.guestCount"
              :allergies="row.original.allergyTypes"
              :provenance-household="row.original.provenanceHousehold"
            />
          </div>
        </div>
      </template>

      <!-- Ticket Column (desktop only) -->
      <template #ticket-cell="{row}">
        <!-- Power row: show DinnerTicket with consensus (desktop) -->
        <div v-if="row.original.rowType === BookingRow.power" :class="COMPONENTS.bookingForm.ticketDesktop">
          <DinnerTicket
            :ticket-config="row.original.ticketConfig"
            :price="row.original.price"
            :dinner-mode="ticketModeOf(row.original)"
            :consensus="row.original.consensus"
            :expected="isPlan(row.original)"
            :cancelled="isCancelled"
          />
        </div>
        <!-- Inhabitant/Guest rows: show ticket -->
        <div v-else-if="row.original.rowType === BookingRow.inhabitant || row.original.rowType === BookingRow['guest-order']" :class="COMPONENTS.bookingForm.ticketDesktop">
          <DinnerTicket
            :ticket-config="row.original.ticketConfig"
            :price="row.original.price"
            :dinner-mode="ticketModeOf(row.original)"
            :ticket-state="row.original.ticketState"
            :expected="isPlan(row.original)"
            :cancelled="isCancelled"
            :guest-count="row.original.guestCount"
            :allergies="row.original.allergyTypes"
            :provenance-household="row.original.provenanceHousehold"
          />
        </div>
      </template>

      <!-- Expanded Row -->
      <template #expanded="{row}">
        <!-- Guest add row: Use standalone GuestBookingForm -->
        <GuestBookingForm
          v-if="row.original.rowType === BookingRow['guest-add'] && bookerInhabitant?.id && household"
          :household-id="household.id"
          :dinner-event="dinnerEvent"
          :ticket-prices="ticketPrices"
          :allergy-types="allergyTypes ?? []"
          :deadlines="deadlines"
          :released-ticket-counts="releasedTicketCounts"
          :booker-id="bookerInhabitant.id"
          :booker-name="bookerInhabitant.name"
          :booking-context="bookingContext"
          :admin-bypass="adminBypass"
          @save="handleGuestSave"
          @cancel="handleCancel"
        />

        <!-- Other row types: UCard with form -->
        <UCard
          v-else
          :color="row.original.rowType === BookingRow.power ? COMPONENTS.powerMode.card.color : COLOR.primary"
          :variant="COMPONENTS.powerMode.card.variant"
          v-bind="COMPONENTS.bookingForm.editCard"
        >
          <template #header>
            <h4 :class="COMPONENTS.bookingForm.editTitle">
              <template v-if="row.original.rowType === BookingRow.power">
                Vælg for hele familien
              </template>
              <template v-else-if="row.original.rowType === BookingRow['guest-order']">
                Opdater gæstebillet
              </template>
              <template v-else>
                Vælg spisning for {{ row.original.name }}
              </template>
            </h4>
          </template>

          <!-- Power mode warning -->
          <UAlert
            v-if="row.original.rowType === BookingRow.power"
            v-bind="ALERTS.warning"
            :icon="COMPONENTS.powerMode.icon"
            title="Du er ved at aktivere power mode"
            :description="`Ændringer påvirker alle ${household?.inhabitants?.length ?? 0} medlemmer.`"
          />

          <!-- The booked inhabitant's allergies, from the household's live profile -->
          <div
            v-if="row.original.rowType === BookingRow.inhabitant && row.original.allergyTypes.length"
            :class="COMPONENTS.bookingForm.allergyLine"
            :data-testid="`${row.original.rowType}-${row.original.id}-allergies`"
          >
            <UIcon :name="ICONS.allergy" :class="COMPONENTS.allergyOverview.glyph" />
            <AllergyTypeDisplay
              v-for="allergyType in row.original.allergyTypes"
              :key="allergyType.id"
              :allergy-type="allergyType"
              compact
              show-name
            />
          </div>

          <!-- Deadline badges (contextual: booking + dining mode) -->
          <div :class="COMPONENTS.bookingForm.editDeadlines">
            <DeadlineBadge :badge="badges.booking" />
            <DeadlineBadge :badge="badges.diningMode" />
          </div>

          <!-- Mode selector: a queued inhabitant changes the wish (requeued) or picks Ingen to leave the queue; a plan shows hinted until a click -->
          <DinnerModeSelector
            :model-value="draftMode ?? row.original.dinnerMode"
            :expected="isPlan(row.original)"
            :cancelled="isCancelled"
            :form-mode="FORM_MODES.EDIT"
            :enabled-modes="row.original.enabledModes"
            :consensus="row.original.consensus"
            :size="SIZES.standard"
            :name="`${row.original.rowType}-${row.original.id}-mode-edit`"
            :orientation="ORIENTATIONS.horizontal"
            show-label
            @update:model-value="(mode: DinnerMode) => draftMode = mode"
          />

          <!-- Order history toggle + display (in body, near the content it reveals) -->
          <div v-if="row.original.order?.id">
            <UButton
                v-bind="BUTTONS.history(historyOrderId === row.original.order.id)"
                aria-label="Vis ordrehistorik"
                @click="toggleHistory(row.original.order.id)"
            />
            <OrderHistoryDisplay v-if="historyOrderId === row.original.order.id" :order-id="row.original.order.id" :class="COMPONENTS.bookingForm.history"/>
          </div>

          <!-- Footer: action preview + buttons (stacked on mobile, horizontal on desktop) -->
          <template #footer>
            <div :class="COMPONENTS.bookingForm.editFooter">
              <ActionPreview :days="previewDays" :pending="isPreviewPending" />

              <div :class="LAYOUTS.formButtonRow">
                <UButton
                  v-bind="BUTTONS.cancel"
                  :data-testid="`${row.original.rowType}-${row.original.id}-cancel`"
                  @click="handleCancel"
                >
                  Annuller
                </UButton>
                <UButton
                  v-bind="row.original.rowType === BookingRow.power ? {} : BUTTONS.save"
                  :color="row.original.rowType === BookingRow.power ? COMPONENTS.powerMode.color : undefined"
                  :loading="isSaving"
                  :disabled="row.original.enabledModes.length === 0"
                  :data-testid="`${row.original.rowType}-${row.original.id}-save`"
                  @click="handleSave(row.original)"
                >
                  <template #leading>
                    <UIcon :name="row.original.rowType === BookingRow.power ? COMPONENTS.powerMode.buttonIcon : ICONS.check" />
                  </template>
                  {{ row.original.rowType === BookingRow.power ? 'Gem for alle' : saveLabel }}
                </UButton>
              </div>
            </div>
          </template>
        </UCard>
      </template>
    </UTable>

    <!-- Legend: shared with the week/month grid -->
    <DinnerModeLegend v-if="tableData.some(canOpenRow)" :show-birthday="tableData.some(row => row.birthdayBadge !== null)" :class="COMPONENTS.bookingForm.legend"/>
  </div>
</template>
