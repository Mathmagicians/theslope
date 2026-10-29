<script setup lang="ts">
/**
 * BookingGridView - Unified week/month grid for household booking management
 *
 * ADR-016: Draft state pattern with Cancel/Save
 * @see HouseholdCard.vue for synthetic row pattern (power mode)
 *
 * VIEW MODE:
 * ┌─────────────────────────────────────────────────────────────┐
 * │  ◀  Uge 3 (13-19 jan)  ▶                               ✏️  │
 * ├──────────────────┬──────┬──────╫──────┬──────┬──────╫──────┤
 * │ Beboer           │  M   │  T   ║  O   │  T   │  F   ║  S   │
 * │                  │ 13/1 │ 14/1 ║ 15/1 │ 16/1 │ 17/1 ║ 19/1 │
 * │                  │      │      ║      │      │      ║      │ <- chip row (fixed h)
 * ├──────────────────┼──────┼──────╫──────┼──────┼──────╫──────┤
 * │⚡Alle            │  🍽️  │  ?   ║  🍽️  │  🍽️  │  🍽️  ║  ❌  │ <- consensus
 * ├──────────────────┼──────┼──────╫──────┼──────┼──────╫──────┤
 * │ Anna V 🎟️4      │  🍽️  │  🍽️  ║  🛍️  │  🍽️  │  🍽️  ║  ❌  │ <- name + ticket count
 * │ Lars V 🎟️3🔓1⌛1 │  🍽️  │  🕐  ║  ⌛  │  ❌  │  🍽️  ║  ❌  │ <- tickets, the released among them, places on the waiting list
 * ├──────────────────┼──────┼──────╫──────┼──────┼──────╫──────┤
 * │ 🎫 Gæst af Anna  │  🍽️  │      ║      │      │  🍽️  ║      │ <- existing guest
 * └──────────────────┴──────┴──────╨──────┴──────┴──────╨──────┘
 *                     ↑ past columns muted
 *
 * EDIT MODE:
 * ┌─────────────────────────────────────────────────────────────┐
 * │  ◀  Uge 3 (13-19 jan)  ▶                                   │
 * ├──────────────────┬──────┬──────╫──────┬──────┬──────╫──────┤
 * │ Beboer           │ 13   │ 14   ║ 15   │To 16 │Fr 17 ║Sø 19 │
 * │                  │(🟠)  │(🟡2) ║(🟠)  │      │      ║      │ <- chip: the dinner's supply (THE COLUMN CHIP)
 * ├──────────────────┼──────┼──────╫──────┼──────┼──────╫──────┤
 * │⚡Alle            │  🍽️  │  ?   ║  🍽️  │  🍽️  │  ?°  ║  ❌  │ <- past=view, future=edit
 * ├──────────────────┼──────┼──────╫──────┼──────┼──────╫──────┤
 * │ Anna V 🎟️4      │  🍽️  │  🍽️  ║  🛍️  │  🍽️  │  🍽️° ║  ❌  │
 * │ Lars V 🎟️3🔓1⌛1 │  🍽️  │  🕐  ║  ⌛  │  ❌° │  🍽️  ║  ❌  │
 * ├──────────────────┼──────┼──────╫──────┼──────┼──────╫──────┤
 * │ 🎫 Gæst af Anna  │  🍽️  │      ║      │      │  🍽️  ║      │ <- existing guest
 * │ ➕ Tilføj gæst   │      │      ║      │  v   │  v   ║  v   │ <- add guest (future only): chevron, up while its form is open
 * ├──────────────────┴──────┴──────╨──────┴──────┴──────╨──────┤
 * │ 3 ændringer                         [Annuller] [Gem]       │
 * └────────────────────────────────────────────────────────────┘
 *
 * NAME CELL COUNTS over the row's dinners in view, each while above 0: 🎟️ the person's own tickets (booked and released),
 * 🔓 the released among them, ⌛ their own places on the waiting list (a guest's place is not theirs).
 *
 * THE COLUMN CHIP on a dinner past its booking deadline shows the dinner's supply, as the dinner calendar's chip and the
 * day view's Framelding badge (lockChip on the store's lockStatus); the name cells keep the household's own counts.
 * Mon 13/1 nothing for sale, nobody waiting; Tue 14/1 3 tickets for sale (2V 1B), 2 of them released by the household;
 * Wed 15/1 nothing for sale, 8V on the waiting list:
 * | Beboer                      |    M     |    T     |    O      |
 * |                             |   13/1   |   14/1   |   15/1    |
 * |                             | (closed) |   (3)    |(hourglass)|
 * | Hele familien               |   ...    |   ...    |   ...     |
 * | Lars  tickets 3, released 1 |   ...    |   ...    |   ...     |
 * The day view on the same dinners: Lukket for framelding · 2V 1B til salg · 8V på venteliste.
 * (closed) = the peach chip, (3) = the yellow chip with the number for sale, (hourglass) = the yellow chip with the
 * hourglass; a dinner with tickets for sale and a waiting list both shows the number.
 *
 * A PERSON'S ROWS BY PRICE: a booked dinner sits on the row of its booked price and ticket type, a dinner without a
 * booking (a place on the waiting list among them) on the row of the price for the person's age on that dinner's date,
 * the day view's price; on the other row that dinner's cell is empty. Every badge reads as the day view's ticket (ticketBadgeLabel):
 * Beboer                             | M 26/10  | T 27/10    | O 28/10  | T 29/10  |
 * Alle [Powermode!]                  | Spisesal | Spisesal   | blandet  | Spisesal |
 * Anna [Voksen · 50 kr]              | Spisesal | Spisesal   |          |          | <- booked before the price changed
 * Anna [Voksen · 55 kr]              |          |            | Takeaway | Spisesal | <- the current price: her other dinners
 * Gæst af Anna [Baby · 0 kr · Gæst]  |          | Spisesal   |          |          |
 * Gæst af Anna [Baby · 9 kr · Gæst]  |          | venteliste |          |          |
 *
 * THE GUEST FORM (a chevron's expanded row, on a phone scrolled to Friday): the row spans every column and the table
 * scrolls sideways in its box; the form keeps to the part of the box in view (COMPONENTS.bookingGrid.expandedPanel):
 * ┌─────────────────────────────────┐
 * │ ➕ Tilføj gæst │  v   │  ^   │ <- the pinned name column, To 16, Fr 17; ^ = the open one
 * │ ┌ Tilføj gæst ────────────────┐ │
 * │ │ GuestBookingForm            │ │ <- the width of the box, whichever chevron opened it
 * │ └─────────────────────────────┘ │
 * └─────────────────────────────────┘
 *
 * THE ACTION BAR (edit mode, the body-bottom row): the preview and the buttons keep to the part of the box in view as
 * the form does (COMPONENTS.bookingGrid.actionPanel); on a phone scrolled to the month's end they stay on screen:
 * │ Du er ved at ændre familiens booking   │ <- ActionPreview
 * │                  [Annuller] [Opdater]  │
 *
 * DAY VIEW: the day-content slot holds DinnerBookingForm (HouseholdBookings). On a phone the household card body has no
 * side padding; the slot (COMPONENTS.bookingGrid.dayContent) carries a card body's, so the form's table keeps its width
 * and scrolls sideways in its box.
 *
 * Visual check: /household/<S>/bookings at 375px and desktop. Week and month: the name cell's three counts. Edit mode on
 * a phone: a guest chevron on a dinner past the first screen opens the form in view; scrolled sideways, the preview and
 * the Annuller/Opdater buttons stay on screen. Day view on a phone: the page keeps its width and the form's table
 * scrolls in its box. Edit mode on a planned dinner: the cells and the power cell stay ghosted until clicked.
 *
 * ROW TYPES:
 * | Row Type    | Icon | VIEW           | EDIT                | Description        |
 * |-------------|------|----------------|---------------------|--------------------|
 * | power       | ⚡   | Consensus/?    | Editable (future)   | Bulk update all    |
 * | inhabitant  | 👤   | Booking state  | Editable (future)   | A person, a price  |
 * | guest-order | 🎫   | Booking state  | Locked past, edit   | Existing guest     |
 * | guest-add   | ➕   | Hidden         | v buttons (future)  | Add new guest      |
 * A guest-order row (a placed group or a queued guest) exists only for a dinner among the columns on view.
 *
 * QUEUED CELL (a sold-out dinner, the inhabitant on the waiting list):
 *   ┌──────┐
 *   │  ⌛ │  the wished mode ghosted (COMPONENTS.waitlist.ghostBadge) under the hourglass in the corner chip
 *   └──────┘  (COMPONENTS.waitlist.chip); the legend gains "På venteliste (#n)" while the household has entries.
 *   In edit mode it toggles through the modes its place may take (the wish, another mode while the mode is open, Ingen
 *   to leave); untouched the wish keeps its ghost, a draft shows in its place, solid with the modified accent, under the
 *   hourglass.
 *   A queued guest has a row of its own, "Gæst af <booker>", its cell a queued cell on its dinner:
 *   │ 🎫 Gæst af Anna  │      │  ⌛  ║      │ <- the guest's wish ghosted under the hourglass
 *   The power cell reaches every place the household holds on the dinner: the wishes count in its consensus, as an
 *   expected cell counts its expected mode, and its Ingen leaves the places.
 *
 * RELEASED CELL (a ticket released after the booking deadline, which the household pays for unless it is sold):
 * | Beboer                       | T 14/1                |
 * | Anna  [Voksen · 55 kr]       | Ingen  (released)     | <- the released icon in the released colour, in the corner
 * | Gæst af Anna [Baby · 0 kr]   | Ingen  (released)     |    and at the size of the hourglass (COMPONENTS.waitlist.chip)
 * | Lars  [Voksen · 55 kr]       | Spisesal (hourglass)  |
 *   The day view's ticket reads "Frigivet" in the same icon and colour; a guest group reads its first ticket's state.
 *
 * THE RULES: every cell offers the modes getBookingOptions gives its row, as the day view does; a cell with none shows
 * its view face, the power cell offers the modes every inhabitant cell may take, and the add-guest chevron shows while a
 * new guest may take a mode: before the deadline and after it (a ticket for sale or the waiting list).
 *
 * WHILE THE BOOKINGS OF THE RANGE LOAD (`loading`, a new range or a save's re-read): UTable's loading bar runs under
 * the column headers and the rows stay; the lock chips wait, they count the household's orders:
 * Familiens bookinger                       [Dag] [Uge] [Måned]
 *                  <-   oktober 2026   ->
 * Beboer      | M 28/9 | T 29/9 | O 30/9 | ... | T 29/10 |
 * ===================================================== <- UTable's loading bar
 * ⚡Alle      |  🍽️    |  ?     |  🍽️    | ... |  ❌     |
 * Anna V 🎟️4 |  🍽️    |  🍽️    |  🛍️    | ... |  ❌     |
 * A range without dinners yet shows the table's loading row (COMPONENTS.table.loadingRow) in place of its empty state:
 *             (sync, spinning)  Henter bookinger...
 *
 * EXPECTED CELLS (a cell without an order or a queue entry): the booking the preferences give it, read from the
 * server's dry run with no orders on the dinners on view, its mode ghosted on the waiting list's neutral
 * (COMPONENTS.bookingGrid.expectedBadge), as a queued wish without its hourglass; a person the run leaves out reads
 * Ingen; the legend always lists "Forventet bestilling ifølge præferencer", and the table's loading bar runs while the
 * read loads. The power cell ghosts its mode while every inhabitant cell on the dinner is expected. In edit mode a plan
 * stays a ghost until it is touched: the first click adopts it as the person's draft (solid, the modified accent), the
 * next ones cycle; the power cell's first click adopts each person's plan. Solid is a booking or an intent, never a plan:
 *   Anna        (Spis)  ->  click  ->  Spis°  ->  click  ->  Sen°
 *   ⚡Alle      (Take)  ->  click  ->  Take°, and every cell under it Take°
 * A draft on an expected cell previews as a cancellation or a booking:
 * Januar 2027, S_31                         Forklaring: [ex] (mode) Forventet bestilling ifølge præferencer
 *             ti 05/01   on 06/01   ti 12/01   on 13/01
 * Anna        (Spis)     (Spis)     (Spis)     (Spis)       <- ghosted: no order yet, the next run books Spisesal
 * Bo          (Take)     Ingen      (Take)     Ingen        <- Bo's Wednesday preference is Ingen: plain Ingen
 * Emil        Ingen      (Spis)     (Spis)     (Spis)       <- Emil cancelled 05/01 earlier: Ingen, not expected
 *
 * THE PREVIEW (edit mode, above the buttons): the draft goes to the server's dry run once the clicks rest, and its reply
 * renders through ActionPreview, a day per dinner; the loader shows while the reply is on the way.
 *
 * CELL STATES: 🍽️=dine-in, 🕐=late, 🛍️=takeaway, ❌=none, ?=no consensus, °=modified, ⌛=queued (the wish ghosted),
 * (mode)=expected (ghosted on neutral), [ex]=the sliders in the legend
 * HEADER CHIPS: (🟠)=locked, (🟡N)=locked with N tickets available
 *
 * A CANCELLED DINNER: its header's chip slot carries the state badge (DINNER_STATE_BADGES.CANCELLED) in place of the lock
 * chip, and every cell of its column shows what it holds on the cancelled face (COMPONENTS.dinnerModeSelector.cancelledFace),
 * offering no mode, in view and edit mode alike:
 * │ Beboer           │ To 16 │    Fr 17     │
 * │                  │ (🟠)  │ [(x) Aflyst] │ <- the state badge
 * │ Anna V           │ [mode]│   -[mode]-   │ <- the ticket she held, struck through
 */
import type {HouseholdDetail, InhabitantDisplay} from '~/composables/useCoreValidation'
import type {BookingIntent, DinnerEventDisplay, OrderDisplay, DinnerMode, DesiredOrder, ScaffoldOrdersRequest} from '~/composables/useBookingValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import type {AllergyTypeDisplay} from '~/composables/useAllergyValidation'
import type {SeasonDeadlines} from '~/composables/useSeason'
import type {DeadlineBadgeData, TicketPresentation} from '~/composables/useBookingUi'
import {compareAsc, isSameDay} from 'date-fns'
import {BookingViewSchema, BookingRowTypeSchema, type BookingView, type BookingRowType} from '~/composables/useBookingView'
import {BOOKING_WORDS} from '~/config/bookingWords'
import type {DateRange} from '~/types/dateTypes'
import {EMPTY_RELEASED_TICKET_COUNTS, bookingContextOf, type BookingChanges, type BookingContext, type GuestBookingIntent, type ReleasedTicketCounts, type WaitlistEntryIntent} from '~/composables/useBooking'
import type {TicketWaitlistDetail} from '~/composables/useWaitlistValidation'
import {FORM_MODES, type FormMode} from '~/types/form'
import {BUTTON_WORDS} from '~/config/buttonWords'

const BookingRow = BookingRowTypeSchema.enum
const View = BookingViewSchema.enum

// The add-guest row's id: its chevrons open the guest form in it
const GUEST_ADD_ROW_ID = 'guest-add'

interface GridRow {
  rowType: BookingRowType
  id: string
  name: string
  inhabitant?: InhabitantDisplay // For inhabitant row, or booker for guest-order
  guestOrders?: OrderDisplay[] // A guest group: one booker, ticket type, price and dinner (groupGuestOrders)
  waitlistEntry?: TicketWaitlistDetail // A queued guest's place
  dinnerEventId?: number // A guest row's dinner
  dinnerEventIds?: number[] // An inhabitant row's dinners in view: those at its price
  price?: number // The ticket price an inhabitant row's dinners or a guest row's tickets hold
  ticketConfig?: TicketPresentation | null // The ticket type of the row's price
  birthdayBadge?: DeadlineBadgeData | null // An inhabitant row holding the person's first dinner at a new ticket type, in view
  guestCount?: number // Number of guest tickets in group
  isSynthetic: boolean
}

interface Props {
  view: BookingView
  dateRange: DateRange
  household: HouseholdDetail
  dinnerEvents: DinnerEventDisplay[]
  orders: OrderDisplay[]
  ticketPrices: TicketPrice[]
  deadlines: SeasonDeadlines
  lockStatus?: Map<number, ReleasedTicketCounts | null>
  waitlistEntries?: TicketWaitlistDetail[] // The household's queue entries: a queued cell shows the wish ghosted
  allergyTypes?: AllergyTypeDisplay[]
  bookerId?: number // Current user's inhabitant ID for guest booking
  formMode?: FormMode
  canEdit?: boolean // Access control: hide edit controls when false
  isSaving?: boolean
  loading?: boolean // The range's bookings are on the way
  hasPrev?: boolean
  hasNext?: boolean
  adminBypass?: boolean // An admin's save lifts the deadlines (ADR-016): its preview reads the same run
}

const props = withDefaults(defineProps<Props>(), {
  lockStatus: () => new Map(),
  waitlistEntries: () => [],
  allergyTypes: () => [],
  bookerId: undefined,
  formMode: FORM_MODES.VIEW,
  canEdit: true,
  isSaving: false,
  loading: false,
  hasPrev: true,
  hasNext: true,
  adminBypass: false
})

// Calendar open state (for toggle in header)
const calendarOpen = defineModel<boolean>('calendarOpen', { default: true })

const emit = defineEmits<{
  save: [changes: BookingChanges]
  cancel: []
  'update:formMode': [mode: FormMode]
  navigate: [direction: 'prev' | 'next']
  addGuest: [orders: DesiredOrder[]]
}>()

const {ICONS, COLOR, SIZES, COMPONENTS, TYPOGRAPHY, BUTTONS, ALERTS, getRandomEmptyMessage, ORDER_STATE_COLORS, DINNER_STATE_BADGES, getResidencyDisplay, LAYOUTS, NOISE} = useTheSlopeDesignSystem()
const now = useClock()
const emptyState = getRandomEmptyMessage('noDinners', now.value)

const {formatPrice, resolveTicketPriceOn, ticketTypeChangeOf} = useTicket()
const {personTicketCounts} = useOrder()

const {getDayBillSummary, getBookingOptions, powerOptions, newGuestRow, buildDesiredOrders, buildGuestDesiredOrders, buildBookingChanges, getPowerChanges, getPowerConsensus} = useBooking()
const {lockChip, createBirthdayBadge, bookingSaveLabel} = useBookingUi()
const bookingsStore = useBookingsStore()

const {OrderStateSchema, BookingActionSchema, DinnerModeSchema} = useBookingValidation()

// ============================================================================
// DRAFT STATE (ADR-016)
// ============================================================================

// Keyed by the cell (expectedBookingKey); the draft names its person and dinner for the save
const draftChanges = ref<Map<string, BookingIntent>>(new Map())
// Keyed by the guest group's order ids: a guest ticket carries its booker's inhabitantId, so the cell key would collide with the booker's own cell
const guestDraftChanges = ref<Map<string, GuestBookingIntent>>(new Map())
const guestDraftKey = (guestOrders: OrderDisplay[]): string => guestOrders.map(order => order.id).join('-')
// Keyed by the entry's id: a queued guest's place, from its own cell or the power cell
const entryDraftChanges = ref<Map<number, WaitlistEntryIntent>>(new Map())
const hasPendingChanges = computed(() => draftChanges.value.size + guestDraftChanges.value.size + entryDraftChanges.value.size > 0)

// A cell's change as the save sends it: a queued cell's names the person's place
const cellIntent = (inhabitantId: number, dinnerEventId: number, dinnerMode: DinnerMode): BookingIntent =>
  ({inhabitantId, dinnerEventId, dinnerMode, waitlistEntryId: personOn.value(inhabitantId, dinnerEventId).waitlistEntry?.id})

const draftBookingChanges = (): BookingChanges => ({
  intents: Array.from(draftChanges.value.values()).map(({inhabitantId, dinnerEventId, dinnerMode}) => cellIntent(inhabitantId, dinnerEventId, dinnerMode)),
  guestIntents: Array.from(guestDraftChanges.value.values()),
  entryIntents: Array.from(entryDraftChanges.value.values())
})

const clearDrafts = () => {
  draftChanges.value.clear()
  guestDraftChanges.value.clear()
  entryDraftChanges.value.clear()
}

// Effective form mode - VIEW when saving to prevent cell edits
const effectiveFormMode = computed(() => props.isSaving ? FORM_MODES.VIEW : props.formMode)

// A released ticket, a person's or a guest's, carries the released icon in its cell's corner, as the day view's ticket
const isReleased = (order: OrderDisplay | null | undefined): boolean => ticketStateOf(order ?? null) === TicketState.released

// What a person holds on a dinner: the order, else the place, else the plan
const personOn = computed(() => personOnDinner(props.orders, props.waitlistEntries, expectedModes.value))

// A draft, else what the person on the dinner shows
const getCellMode = (inhabitantId: number, eventId: number): DinnerMode =>
  draftChanges.value.get(expectedBookingKey(inhabitantId, eventId))?.dinnerMode ?? personOn.value(inhabitantId, eventId).shownMode

const isCellModified = (inhabitantId: number, eventId: number): boolean =>
  draftChanges.value.has(expectedBookingKey(inhabitantId, eventId))

// A cell shows its expected booking ghosted until a draft takes its place
const isCellExpected = (inhabitantId: number, eventId: number): boolean =>
  !isCellModified(inhabitantId, eventId) && personOn.value(inhabitantId, eventId).expectedMode !== undefined

// A draft equal to what the cell holds is no change; a plan holds nothing, so on it every mode is the person's intent
const handleCellUpdate = (inhabitantId: number, eventId: number, newMode: DinnerMode) => {
  const key = expectedBookingKey(inhabitantId, eventId)
  const {expectedMode, heldMode} = personOn.value(inhabitantId, eventId)
  if (expectedMode === undefined && newMode === heldMode) {
    draftChanges.value.delete(key)
  } else {
    draftChanges.value.set(key, {inhabitantId, dinnerEventId: eventId, dinnerMode: newMode})
  }
}

// A group's cell reads its first ticket, as the day view's guest row does; a group without tickets holds nothing
const guestHeldMode = (guestOrders: OrderDisplay[]): DinnerMode => guestOrders[0]?.dinnerMode ?? DinnerModeSchema.enum.NONE

const getGuestCellMode = (guestOrders: OrderDisplay[]): DinnerMode =>
  guestDraftChanges.value.get(guestDraftKey(guestOrders))?.dinnerMode ?? guestHeldMode(guestOrders)

const isGuestCellModified = (guestOrders: OrderDisplay[]): boolean => guestDraftChanges.value.has(guestDraftKey(guestOrders))

const handleGuestCellUpdate = ({guestOrders, dinnerMode}: GuestBookingIntent) => {
  const key = guestDraftKey(guestOrders)
  if (dinnerMode === guestHeldMode(guestOrders)) {
    guestDraftChanges.value.delete(key)
  } else {
    guestDraftChanges.value.set(key, {guestOrders, dinnerMode})
  }
}

const getEntryCellMode = (entry: TicketWaitlistDetail): DinnerMode =>
  entryDraftChanges.value.get(entry.id)?.dinnerMode ?? entry.order.dinnerMode

const isEntryCellModified = (entry: TicketWaitlistDetail): boolean => entryDraftChanges.value.has(entry.id)

const handleEntryUpdate = ({entry, dinnerMode}: WaitlistEntryIntent) => {
  if (dinnerMode === entry.order.dinnerMode) {
    entryDraftChanges.value.delete(entry.id)
  } else {
    entryDraftChanges.value.set(entry.id, {entry, dinnerMode})
  }
}

const householdInhabitantIds = computed(() => props.household.inhabitants.map(i => i.id))

// The power cell shows a plan while every inhabitant cell on the dinner does
const isPowerExpected = (eventId: number): boolean =>
  householdInhabitantIds.value.length > 0 && householdInhabitantIds.value.every(inhabitantId => isCellExpected(inhabitantId, eventId))

// On a planned dinner the power cell's shown mode adopts each person's plan as their draft; any other mode goes to every cell
const handlePowerUpdate = (eventId: number, newMode: DinnerMode) => {
  if (isPowerExpected(eventId) && newMode === getEventConsensus(eventId).value) {
    householdInhabitantIds.value.forEach(inhabitantId => handleCellUpdate(inhabitantId, eventId, getCellMode(inhabitantId, eventId)))
    return
  }
  const {intents, guestIntents, entryIntents} = getPowerChanges(householdInhabitantIds.value, props.orders, props.waitlistEntries, eventId, newMode)
  intents.forEach(({inhabitantId, dinnerMode}) => handleCellUpdate(inhabitantId, eventId, dinnerMode))
  guestIntents.forEach(handleGuestCellUpdate)
  entryIntents.forEach(handleEntryUpdate)
}

const handleCancel = () => {
  clearDrafts()
  emit('update:formMode', FORM_MODES.VIEW)
  emit('cancel')
}

const handleSave = () => {
  emit('save', draftBookingChanges())
  clearDrafts()
  emit('update:formMode', FORM_MODES.VIEW)
}

// ============================================================================
// GUEST BOOKING EXPANDABLE ROW
// ============================================================================

// The dinner whose add-guest chevron opened the guest form
const activeGuestEventId = ref<number | null>(null)

// Only the add-guest row expands; handleGuestAdd sets its dinner before it opens
const {expanded} = useExpandableRow({
  onExpand: (rowId) => {
    if (rowId !== GUEST_ADD_ROW_ID) activeGuestEventId.value = null
  },
  onCollapse: () => {
    activeGuestEventId.value = null
  }
})

// The open dinner's chevron closes the form, another dinner's moves the form to it
const handleGuestAdd = (eventId: number) => {
  const isOpenDinner = activeGuestEventId.value === eventId
  activeGuestEventId.value = eventId
  expanded.value = expanded.value[GUEST_ADD_ROW_ID] && isOpenDinner ? {} : {[GUEST_ADD_ROW_ID]: true}
}

// Get active event for GuestBookingForm
const activeGuestEvent = computed(() =>
  activeGuestEventId.value
    ? props.dinnerEvents.find(e => e.id === activeGuestEventId.value)
    : null
)

// Handle GuestBookingForm save
const handleGuestSave = (orders: DesiredOrder[]) => {
  emit('addGuest', orders)
  expanded.value = {}
}

// ============================================================================
// COMPUTED: Dinner events grouped by week
// ============================================================================

const eventsByWeek = computed(() => {
  if (props.dinnerEvents.length === 0) return []
  return getEventsForGridView(props.dinnerEvents, props.dateRange)
})

const flatEvents = computed(() => eventsByWeek.value.flat())

// ============================================================================
// THE SERVER'S DRY RUN: the expected bookings and the preview of the draft
// ============================================================================

// The bookings the scaffold will make on the dinners on view
const {expectedModes, isExpectedPending} = useExpectedBookings(
  () => props.household,
  () => props.view !== View.day ? flatEvents.value : [],
  () => props.orders
)

// What saving the draft does: the dinners it changes, as the save sends them
const previewRequest = computed((): ScaffoldOrdersRequest | null => {
  if (!hasPendingChanges.value) return null
  const orders = buildBookingChanges(draftBookingChanges(), props.orders, props.household.inhabitants, props.dinnerEvents, props.ticketPrices)
  return orders.length > 0
    ? {householdId: props.household.id, dinnerEventIds: [...new Set(orders.map(o => o.dinnerEventId))], orders}
    : null
})
const {result: preview, pending: isPreviewPending} = useScaffoldPreview(
  () => previewRequest.value,
  request => bookingsStore.previewBookings(request, props.adminBypass),
  {debounced: true}
)
const previewDays = computed(() => preview.value ? formatPreviewLines(preview.value, householdInhabitantIds.value) : [])

// ============================================================================
// COMPUTED: Dynamic columns (fixed + dinner events)
// ============================================================================

const columns = computed(() => {
  const fixedColumns = [
    {id: 'name', header: 'Beboer', footer: () => 'Sum', size: 120}
  ]

  // Dynamic columns for each dinner event (footer via slot template)
  const eventColumns = flatEvents.value.map((event, idx) => {
    const isWeekBoundary = isFirstEventOfWeek(event, idx)
    const boundaryClass = isWeekBoundary ? COMPONENTS.bookingGrid.weekBoundary : ''
    return {
      id: `event-${event.id}`,
      header: formatCompactWeekdayDate(event.date),
      size: 50,
      meta: {
        eventId: event.id,
        isWeekBoundary,
        class: {
          th: boundaryClass,
          td: boundaryClass,
          tf: boundaryClass
        }
      }
    }
  })

  return [...fixedColumns, ...eventColumns]
})

// Column pinning - fixed columns on left
const columnPinning = ref({
  left: ['name'],
  right: [] as string[]
})

// ============================================================================
// COMPUTED: Table rows (synthetic power row + inhabitants)
// ============================================================================

// The season's dinners, in date order: a person's first dinner at a new ticket type is found over them, in view or not
const seasonDinnerDates = computed(() => props.dinnerEvents.map(event => event.date).sort(compareAsc))

// A person's rows, a row per price their dinners in view hold: a dinner's order's price, else the day view's price for
// their age on the dinner's date; a place on the waiting list holds no order. Each row counts its own dinners in the name
// cell; the row holding the person's first dinner at a new ticket type, at that type, carries the birthday badge
const inhabitantRows = computed(() => props.household.inhabitants.flatMap(inhabitant => {
  const orderOn = (event: DinnerEventDisplay) => personOn.value(inhabitant.id, event.id).order
  const ticketPriceOf = (event: DinnerEventDisplay) =>
    resolveTicketPriceOn(inhabitant.birthDate ?? null, orderOn(event), props.ticketPrices, event.date)
  const priceOf = (event: DinnerEventDisplay) => orderOn(event)?.priceAtBooking ?? ticketPriceOf(event)?.price ?? 0
  const change = ticketTypeChangeOf(inhabitant.birthDate, props.ticketPrices)(seasonDinnerDates.value)
  const birthdayBadgeOf = (events: DinnerEventDisplay[]): DeadlineBadgeData | null => {
    const changeEvent = change && events.find(event => isSameDay(event.date, change.date))
    return change && changeEvent && ticketPriceOf(changeEvent)?.ticketType === change.ticketType ? createBirthdayBadge(change.ticketType, change.date) : null
  }
  return Array.from(groupBy<DinnerEventDisplay, number>(priceOf)(flatEvents.value), ([price, events]) => {
    const dinnerEventIds = events.map(event => event.id)
    // The row's ticket type reads the first of its dinners, all at its price
    const [first] = events
    return {
      row: {
        rowType: BookingRow.inhabitant,
        id: `inhabitant-${inhabitant.id}-${price}`,
        name: inhabitant.name,
        inhabitant,
        dinnerEventIds,
        price,
        ticketConfig: ticketPricePresentation(first ? ticketPriceOf(first) : undefined),
        birthdayBadge: birthdayBadgeOf(events),
        isSynthetic: false
      } satisfies GridRow,
      counts: personTicketCounts(
        events.flatMap(event => orderOn(event) ?? []),
        events.flatMap(event => personOn.value(inhabitant.id, event.id).waitlistEntry ?? [])
      )
    }
  })
}))

// The guest rows, as the day view builds them (guestItemsOf)
const guestRows = computed((): GridRow[] => {
  // The orders and the waiting list reach past the range (the season's locked dinners): a row needs its dinner's column
  const onView = new Set(flatEvents.value.map(event => event.id))
  const bookerOf = (inhabitantId: number) => props.household.inhabitants.find(i => i.id === inhabitantId)
  return guestItemsOf(
    props.orders.filter(order => onView.has(order.dinnerEventId)),
    props.waitlistEntries.filter(entry => onView.has(entry.dinnerEventId)),
    props.ticketPrices
  ).map(({id, orders, waitlistEntry, held, ticketPrice}): GridRow => ({
    rowType: BookingRow['guest-order'],
    id,
    name: BOOKING_WORDS.guests.name,
    inhabitant: bookerOf(held.inhabitantId),
    guestOrders: waitlistEntry ? undefined : orders,
    waitlistEntry,
    dinnerEventId: held.dinnerEventId,
    price: held.priceAtBooking,
    ticketConfig: ticketPricePresentation(ticketPrice),
    guestCount: Math.max(orders.length, 1),
    isSynthetic: false
  }))
})

const tableData = computed((): GridRow[] => {
  // No dinners in the period means no grid: the synthetic power row would otherwise keep
  // the table populated and its #empty slot unreachable.
  if (flatEvents.value.length === 0) return []

  const rows: GridRow[] = []

  // Power row - ALWAYS shown (consensus in VIEW, editable in EDIT)
  rows.push({
    rowType: BookingRow.power,
    id: 'power-mode',
    name: 'Alle',
    isSynthetic: true
  })

  rows.push(...inhabitantRows.value.map(({row}) => row))
  rows.push(...guestRows.value)

  // Guest add row - only in EDIT mode
  if (props.formMode === FORM_MODES.EDIT) {
    rows.push({
      rowType: BookingRow['guest-add'],
      id: GUEST_ADD_ROW_ID,
      name: 'Tilføj gæst',
      isSynthetic: true
    })
  }

  return rows
})

// ============================================================================
// HELPERS
// ============================================================================

// The name cell's counts over the row's dinners, one entry per inhabitant row; any other row counts nothing
const countsByRow = computed(() => new Map(inhabitantRows.value.map(({row, counts}) => [row.id, counts])))
const countsOf = (row: GridRow) => countsByRow.value.get(row.id) ?? personTicketCounts([], [])

// An inhabitant row's cell on a dinner at another price stays empty
const holdsDinner = (row: GridRow, eventId: number): boolean => row.dinnerEventIds?.includes(eventId) ?? false

// A row's ticket badge reads as the day view's ticket: the type and the price, a guest row's guests
const rowBadgeLabel = ({ticketConfig, price, guestCount}: GridRow): string | null =>
  ticketConfig && price !== undefined ? ticketBadgeLabel(ticketConfig.label, price, guestCount) : null

// The consensus of the modes the cells show: a draft, else an expected cell's expected mode; a place counts its wish
const getEventConsensus = (eventId: number): { value: DinnerMode, consensus: boolean } =>
  getPowerConsensus(householdInhabitantIds.value, props.orders, props.waitlistEntries, eventId, {
    inhabitant: inhabitantId => draftChanges.value.get(expectedBookingKey(inhabitantId, eventId))?.dinnerMode ?? personOn.value(inhabitantId, eventId).expectedMode,
    guestGroup: guestOrders => guestDraftChanges.value.get(guestDraftKey(guestOrders))?.dinnerMode,
    entry: entry => entryDraftChanges.value.get(entry.id)?.dinnerMode
  })

const isFirstEventOfWeek = (event: DinnerEventDisplay, idx: number): boolean => {
  if (idx === 0) return false
  const weekIndex = eventsByWeek.value.findIndex(week => week.some(e => e.id === event.id))
  return eventsByWeek.value[weekIndex]?.[0]?.id === event.id
}

// ============================================================================
// THE RULES: the modes each cell may pick (getBookingOptions, as the day view)
// ============================================================================

const canBookEvent = (event: DinnerEventDisplay): boolean => props.deadlines.canModifyOrders(event.date)

const householdContext = computed(() => bookingContextOf(props.household, props.deadlines, props.ticketPrices, now.value))
const contextOf = (event: DinnerEventDisplay): BookingContext => householdContext.value(event)

// Each candidate is the desired order the save sends for the cell in a mode (buildBookingChanges' builders).
// The cell slots render inside UTable's render: a fresh array per render makes every selector patch on every click, one array per cell lets Vue skip the untouched ones
const enabledModesByCell = computed(() => {
  const eventById = new Map(flatEvents.value.map(event => [event.id, event]))
  // Each column's inhabitant cells, which its power cell intersects
  const columns = flatEvents.value.map(event => ({
    event,
    inhabitantCells: props.household.inhabitants.map(({id}) => [
      expectedBookingKey(id, event.id),
      getBookingOptions({
        order: personOn.value(id, event.id).order,
        waitlistEntry: personOn.value(id, event.id).waitlistEntry ?? null,
        candidate: dinnerMode => buildDesiredOrders([cellIntent(id, event.id, dinnerMode)], props.orders, props.household.inhabitants, props.dinnerEvents, props.ticketPrices)[0] ?? null
      }, contextOf(event))
    ] as const)
  }))
  const inhabitantCells = columns.flatMap(column => column.inhabitantCells)
  // A guest row holds its place or its group's tickets on a dinner in view
  const guestCells = guestRows.value.flatMap(({id, guestOrders, waitlistEntry, dinnerEventId}) => {
    const event = dinnerEventId === undefined ? undefined : eventById.get(dinnerEventId)
    const held = guestOrders?.[0]
    const row = waitlistEntry
      ? {order: null, waitlistEntry, candidate: (dinnerMode: DinnerMode) => buildEntryDesiredOrder({entry: waitlistEntry, dinnerMode}, OrderStateSchema.enum.BOOKED)}
      : guestOrders && held && {order: held, waitlistEntry: null, candidate: (dinnerMode: DinnerMode) => buildGuestDesiredOrders([{guestOrders, dinnerMode}], props.ticketPrices)[0] ?? null}
    return event && row ? [[id, getBookingOptions(row, contextOf(event))] as const] : []
  })
  const eventCells = columns.flatMap(({event, inhabitantCells: columnCells}) => [
    [`power-${event.id}`, powerOptions(columnCells.map(([, modes]) => modes))] as const,
    [`guest-add-${event.id}`, getBookingOptions(newGuestRow(props.bookerId, event.id, props.ticketPrices), contextOf(event))] as const
  ])
  return new Map<string, DinnerMode[]>([...inhabitantCells, ...guestCells, ...eventCells])
})
// A cell the map holds no modes for offers none
const modesOf = (key: string): DinnerMode[] => enabledModesByCell.value.get(key) ?? []
const getCellModes = (inhabitantId: number, eventId: number): DinnerMode[] => modesOf(expectedBookingKey(inhabitantId, eventId))
const getGuestModes = (row: GridRow): DinnerMode[] => modesOf(row.id)
const getPowerModes = (event: DinnerEventDisplay): DinnerMode[] => modesOf(`power-${event.id}`)
const getNewGuestModes = (event: DinnerEventDisplay): DinnerMode[] => modesOf(`guest-add-${event.id}`)

// A cell without a mode to pick shows its view face; in edit mode the others toggle through theirs
const cellFormMode = (modes: DinnerMode[]): FormMode => modes.length === 0 ? FORM_MODES.VIEW : effectiveFormMode.value
const cellInteraction = (modes: DinnerMode[]) => cellFormMode(modes) === FORM_MODES.EDIT ? 'toggle' : 'buttons'

// A column the household cannot book: no mode in its power cell (past, outside residency, cancelled or consumed)
const isEventDisabled = (event: DinnerEventDisplay): boolean => getPowerModes(event).length === 0


// Residency alert: shown when any visible event falls outside residency
const residencyAlert = computed(() => {
  const hasDisabledByResidency = flatEvents.value.some(e => !contextOf(e).isHouseholdInResidency(e.date))
  if (!hasDisabledByResidency) return null
  return getResidencyDisplay(props.household.movedInDate, props.household.moveOutDate, now.value)
})

// The column header's lock chip on a locked dinner shows the dinner's supply, as the dinner calendar's: it waits with the
// rows. Read once per header, keyed by its dinner, so the template narrows the chip
const headerLockChipOf = (event: DinnerEventDisplay) => ({
  key: event.id,
  chip: props.loading || canBookEvent(event) ? null : lockChip(event, props.lockStatus, now.value)
})

// ============================================================================
// NAVIGATION
// ============================================================================

const navigationLabel = computed(() => {
  if (!props.dateRange.start || !props.dateRange.end) return ''

  switch (props.view) {
    case View.day: return formatFullWeekdayDate(props.dateRange.start)
    case View.week: return formatWeekRange(props.dateRange.start, props.dateRange.end)
    default: return formatMonthYear(props.dateRange.start)
  }
})

// ============================================================================
// EVENT SUMMARIES (for footer - matches economy view format)
// ============================================================================

const getEventSummary = (eventId: number) => {
  const eventOrders = props.orders.filter(o => o.dinnerEventId === eventId)
  return getDayBillSummary(eventOrders)
}
</script>

<template>
  <div data-testid="booking-grid-view" :class="COMPONENTS.bookingGrid.root">
    <!-- Navigation Header (3-column: spacer | centered nav | edit button) -->
    <div :class="COMPONENTS.bookingGrid.nav">
      <div :class="COMPONENTS.bookingGrid.navSide" />
      <CalendarDateNav
        :open="calendarOpen"
        :has-prev="props.hasPrev"
        :has-next="props.hasNext"
        :disabled="props.isSaving"
        @prev="emit('navigate', 'prev')"
        @next="emit('navigate', 'next')"
        @toggle="calendarOpen = !calendarOpen"
      >
        {{ navigationLabel }}
      </CalendarDateNav>
      <div :class="COMPONENTS.bookingGrid.navEnd">
        <!-- Pencil button to enter edit mode (week/month grid only, hidden when !canEdit) -->
        <UButton
          v-if="view !== View.day && formMode === FORM_MODES.VIEW && canEdit"
          v-bind="BUTTONS.edit"
          :disabled="props.isSaving"
          data-testid="grid-edit"
          @click="emit('update:formMode', FORM_MODES.EDIT)"
        />
      </div>
    </div>

    <!-- Residency alert: grid views only (week/month). Day view delegates to DinnerBookingForm. -->
    <UAlert
      v-if="residencyAlert && view !== View.day"
      v-bind="ALERTS[residencyAlert.color]"
      :icon="residencyAlert.icon"
      :title="residencyAlert.alertTitle"
      :description="residencyAlert.alertDescription"
      data-testid="outside-residency-alert"
      :class="COMPONENTS.bookingGrid.alert"
    />

    <!-- Day view: slot for DinnerBookingForm -->
    <div v-if="view === View.day" :class="COMPONENTS.bookingGrid.dayContent">
      <slot name="day-content" />
    </div>

    <!-- Grid Table (week/month only) -->
    <UTable
      v-else
      v-model:column-pinning="columnPinning"
      v-model:expanded="expanded"
      sticky
      :data="tableData"
      :columns="columns"
      :loading="loading || isExpectedPending"
      :get-row-id="rowIdOf"
      :ui="COMPONENTS.table.gridUi"
    >
      <template #loading>
        <div :class="COMPONENTS.table.loadingRow">
          <UIcon :name="ICONS.sync" :size="SIZES.smallIconSize" :class="COMPONENTS.table.loadingSpinner" />
          Henter bookinger...
        </div>
      </template>

      <!-- Empty state -->
      <template #empty>
        <UAlert
          v-bind="ALERTS.emptyState"
          :avatar="{ text: emptyState.emoji, size: SIZES.emptyStateAvatar }"
        >
          <template #title>{{ emptyState.text }}</template>
          <template #description>
            {{ view === View.week ? 'Ingen middage denne uge' : 'Ingen middage denne måned' }}
          </template>
        </UAlert>
      </template>

      <!-- Dynamic event column headers: M / 29/1 / chip (fixed height) -->
      <template v-for="event in flatEvents" :key="`header-${event.id}`" #[`event-${event.id}-header`]>
        <div :class="[COMPONENTS.bookingGrid.eventHeader, isEventDisabled(event) && COMPONENTS.bookingGrid.eventHeaderDisabled]">
          <span :class="TYPOGRAPHY.caption">{{ formatDate(event.date, 'EEEEE') }}</span>
          <span :class="TYPOGRAPHY.finePrint">{{ formatDate(event.date, 'd/M') }}</span>
          <!-- Fixed height slot for chip: 🟠=locked, 🟡N=locked with N tickets; a cancelled dinner's state badge in its place -->
          <div :class="COMPONENTS.bookingGrid.chipSlot">
            <UBadge
              v-if="isDinnerCancelled(event)"
              :color="DINNER_STATE_BADGES.CANCELLED.color"
              :icon="DINNER_STATE_BADGES.CANCELLED.icon"
              :variant="NOISE.subtle"
              :size="SIZES.small"
            >
              {{ DINNER_STATE_BADGES.CANCELLED.label }}
            </UBadge>
            <template v-else>
              <template v-for="{key, chip} in [headerLockChipOf(event)]" :key="key">
                <UChip
                  v-if="chip"
                  v-bind="COMPONENTS.bookingGrid.lockChip"
                  :color="chip.color"
                  :text="chip.text"
                  :ui="chip.icon ? COMPONENTS.dinnerCalendar.queueChip.ui : undefined"
                >
                  <template v-if="chip.icon" #content>
                    <UIcon :name="chip.icon" :class="COMPONENTS.dinnerCalendar.queueChip.icon" />
                  </template>
                </UChip>
              </template>
            </template>
          </div>
        </div>
      </template>

      <!-- Name column -->
      <template #name-cell="{row}">
        <!-- Power row -->
        <div v-if="row.original.rowType === BookingRow.power" :class="COMPONENTS.bookingGrid.powerName">
          <UIcon :name="COMPONENTS.powerMode.buttonIcon" :class="COMPONENTS.powerMode.iconClass" />
          <UBadge :color="COMPONENTS.powerMode.color" :variant="NOISE.subtle" :size="SIZES.sm">
            {{ COMPONENTS.powerMode.ticketConfig.label }}
          </UBadge>
        </div>
        <!-- Inhabitant row: user + ticket count badge + released badge + waiting-list badge -->
        <div v-else-if="row.original.rowType === BookingRow.inhabitant && row.original.inhabitant" :class="COMPONENTS.bookingGrid.inhabitantName">
          <UserListItem
            :inhabitants="row.original.inhabitant"
            :link-to-profile="false"
            compact
          >
            <template #badge>
              <UBadge
                v-if="row.original.ticketConfig"
                :color="row.original.ticketConfig.color"
                :variant="NOISE.subtle"
                :size="SIZES.xs"
              >
                {{ rowBadgeLabel(row.original) }}
              </UBadge>
              <DeadlineBadge v-if="row.original.birthdayBadge" :badge="row.original.birthdayBadge" compact :data-testid="`${row.original.id}-birthday`" />
            </template>
          </UserListItem>
          <!-- Ticket count badge (only if > 0) -->
          <UBadge
            v-if="countsOf(row.original).total > 0"
            :data-testid="`${row.original.id}-ticket-count`"
            :color="COLOR.neutral"
            :variant="NOISE.soft"
            :size="SIZES.xs"
          >
            <UIcon :name="ICONS.ticket" :class="COMPONENTS.bookingGrid.countIcon" />
            {{ countsOf(row.original).total }}
          </UBadge>
          <!-- Released badge (only if > 0) -->
          <UBadge
            v-if="countsOf(row.original).released > 0"
            :data-testid="`${row.original.id}-released-count`"
            :color="ORDER_STATE_COLORS[TicketState.released]"
            :variant="NOISE.soft"
            :size="SIZES.xs"
          >
            <UIcon :name="ICONS.released" :class="COMPONENTS.bookingGrid.countIcon" />
            {{ countsOf(row.original).released }}
          </UBadge>
          <!-- Waiting-list badge (only if > 0) -->
          <UBadge
            v-if="countsOf(row.original).queued > 0"
            :data-testid="`${row.original.id}-waitlist-count`"
            :color="ORDER_STATE_COLORS[TicketState.queued]"
            :variant="NOISE.soft"
            :size="SIZES.xs"
          >
            <UIcon :name="ICONS.waitlist" :class="COMPONENTS.bookingGrid.countIcon" />
            {{ countsOf(row.original).queued }}
          </UBadge>
        </div>
        <!-- Guest order row - show who invited using UserListItem (same as DinnerBookingForm) -->
        <div v-else-if="row.original.rowType === BookingRow['guest-order']" :class="COMPONENTS.bookingGrid.guestName">
          <UIcon :name="ICONS.userPlus" :class="COMPONENTS.bookingGrid.guestIcon" />
          <span :class="COMPONENTS.bookingGrid.guestLabel">{{ BOOKING_WORDS.guests.of }}</span>
          <UserListItem
            v-if="row.original.inhabitant"
            :inhabitants="row.original.inhabitant"
            :link-to-profile="false"
            compact
            :show-names="true"
          >
            <template #badge>
              <UBadge
                v-if="row.original.ticketConfig"
                :color="row.original.ticketConfig.color"
                :variant="NOISE.subtle"
                :size="SIZES.xs"
              >
                {{ rowBadgeLabel(row.original) }}
              </UBadge>
            </template>
          </UserListItem>
          <span v-else :class="COMPONENTS.bookingGrid.guestUnknown">ukendt</span>
        </div>
        <!-- Guest add row -->
        <div v-else-if="row.original.rowType === BookingRow['guest-add']" :class="COMPONENTS.bookingGrid.guestAddName">
          <UIcon :name="COMPONENTS.guestRow.addIcon" :class="COMPONENTS.guestRow.iconClass" />
          <span :class="COMPONENTS.bookingGrid.guestAddLabel">{{ row.original.name }}</span>
        </div>
      </template>

      <!-- Dynamic event columns - cells -->
      <template v-for="event in flatEvents" :key="event.id" #[`event-${event.id}-cell`]="{row}">
        <!-- Power row: consensus mode or ? (DinnerModeSelector handles both) -->
        <DinnerModeSelector
          v-if="row.original.rowType === BookingRow.power"
          :model-value="getEventConsensus(event.id).value"
          :form-mode="cellFormMode(getPowerModes(event))"
          :interaction="cellInteraction(getPowerModes(event))"
          :enabled-modes="getPowerModes(event)"
          :consensus="getEventConsensus(event.id).consensus"
          :expected="isPowerExpected(event.id)"
          :cancelled="isDinnerCancelled(event)"
          :size="SIZES.standard"
          :name="`power-${event.id}`"
          @update:model-value="(mode: DinnerMode) => handlePowerUpdate(event.id, mode)"
        />
        <!-- Inhabitant row, queued: the wish ghosted under the hourglass until a draft takes its place. Here and in the
             cells below, a one-item loop names the row's checked value for the change handler, which runs later -->
        <UChip
          v-else-if="row.original.rowType === BookingRow.inhabitant && row.original.inhabitant && holdsDinner(row.original, event.id) && personOn(row.original.inhabitant.id, event.id).waitlistEntry"
          v-bind="COMPONENTS.waitlist.chip"
          :data-testid="`grid-waitlist-${row.original.inhabitant.id}-${event.id}`"
        >
          <DinnerModeSelector
            v-for="inhabitantId in [row.original.inhabitant.id]"
            :key="inhabitantId"
            :model-value="getCellMode(inhabitantId, event.id)"
            :form-mode="cellFormMode(getCellModes(inhabitantId, event.id))"
            :interaction="cellInteraction(getCellModes(inhabitantId, event.id))"
            :enabled-modes="getCellModes(inhabitantId, event.id)"
            :cancelled="isDinnerCancelled(event)"
            :size="SIZES.standard"
            :name="`cell-${inhabitantId}-${event.id}`"
            :is-modified="isCellModified(inhabitantId, event.id)"
            :ghost="!isCellModified(inhabitantId, event.id)"
            @update:model-value="(mode: DinnerMode) => handleCellUpdate(inhabitantId, event.id, mode)"
          />
          <template #content>
            <UIcon :name="ICONS.waitlist" :class="COMPONENTS.waitlist.chipIcon" />
          </template>
        </UChip>
        <!-- Inhabitant row: a dinner at the row's price; a released ticket carries the released icon in the corner -->
        <UChip
          v-else-if="row.original.rowType === BookingRow.inhabitant && row.original.inhabitant && holdsDinner(row.original, event.id)"
          v-bind="COMPONENTS.waitlist.chip"
          :color="ORDER_STATE_COLORS[TicketState.released]"
          :show="isReleased(personOn(row.original.inhabitant.id, event.id).order)"
        >
          <DinnerModeSelector
            v-for="inhabitantId in [row.original.inhabitant.id]"
            :key="inhabitantId"
            :model-value="getCellMode(inhabitantId, event.id)"
            :form-mode="cellFormMode(getCellModes(inhabitantId, event.id))"
            :interaction="cellInteraction(getCellModes(inhabitantId, event.id))"
            :enabled-modes="getCellModes(inhabitantId, event.id)"
            :cancelled="isDinnerCancelled(event)"
            :size="SIZES.standard"
            :name="`cell-${inhabitantId}-${event.id}`"
            :is-modified="isCellModified(inhabitantId, event.id)"
            :expected="isCellExpected(inhabitantId, event.id)"
            @update:model-value="(mode: DinnerMode) => handleCellUpdate(inhabitantId, event.id, mode)"
          />
          <template #content>
            <UIcon :name="ICONS.released" :class="COMPONENTS.waitlist.chipIcon" />
          </template>
        </UChip>
        <!-- Guest row, queued: the guest's wish ghosted under the hourglass, as a queued inhabitant's -->
        <UChip
          v-else-if="row.original.rowType === BookingRow['guest-order'] && row.original.waitlistEntry && row.original.dinnerEventId === event.id"
          v-bind="COMPONENTS.waitlist.chip"
          :data-testid="`grid-waitlist-${row.original.id}-${event.id}`"
        >
          <DinnerModeSelector
            v-for="entry in [row.original.waitlistEntry]"
            :key="entry.id"
            :model-value="getEntryCellMode(entry)"
            :form-mode="cellFormMode(getGuestModes(row.original))"
            :interaction="cellInteraction(getGuestModes(row.original))"
            :enabled-modes="getGuestModes(row.original)"
            :cancelled="isDinnerCancelled(event)"
            :size="SIZES.standard"
            :name="`guest-${row.original.id}-${event.id}`"
            :is-modified="isEntryCellModified(entry)"
            :ghost="!isEntryCellModified(entry)"
            @update:model-value="(mode: DinnerMode) => handleEntryUpdate({entry, dinnerMode: mode})"
          />
          <template #content>
            <UIcon :name="ICONS.waitlist" :class="COMPONENTS.waitlist.chipIcon" />
          </template>
        </UChip>
        <!-- Guest order row: a group holds the guest tickets of one dinner; its first ticket's state, as the day view's guest row reads it -->
        <UChip
          v-else-if="row.original.rowType === BookingRow['guest-order'] && row.original.guestOrders && row.original.dinnerEventId === event.id"
          v-bind="COMPONENTS.waitlist.chip"
          :color="ORDER_STATE_COLORS[TicketState.released]"
          :show="isReleased(row.original.guestOrders[0])"
        >
          <DinnerModeSelector
            v-for="guestOrders in [row.original.guestOrders]"
            :key="guestDraftKey(guestOrders)"
            :model-value="getGuestCellMode(guestOrders)"
            :form-mode="cellFormMode(getGuestModes(row.original))"
            :interaction="cellInteraction(getGuestModes(row.original))"
            :enabled-modes="getGuestModes(row.original)"
            :cancelled="isDinnerCancelled(event)"
            :size="SIZES.standard"
            :name="`guest-${row.original.id}-${event.id}`"
            :is-modified="isGuestCellModified(guestOrders)"
            @update:model-value="(mode: DinnerMode) => handleGuestCellUpdate({guestOrders, dinnerMode: mode})"
          />
          <template #content>
            <UIcon :name="ICONS.released" :class="COMPONENTS.waitlist.chipIcon" />
          </template>
        </UChip>
        <!-- Guest add row: a chevron per dinner a new guest may take a mode on, turned up while its form is open below -->
        <UButton
          v-else-if="row.original.rowType === BookingRow['guest-add'] && getNewGuestModes(event).length > 0"
          :icon="ICONS.chevronDown"
          :color="COMPONENTS.guestRow.color"
          :variant="NOISE.quiet"
          :size="SIZES.standard"
          :data-testid="`guest-add-${event.id}`"
          :class="COMPONENTS.openTurn(activeGuestEventId === event.id)"
          @click="handleGuestAdd(event.id)"
        />
      </template>

      <!-- Dynamic event column footers: ticket counts + price on separate lines -->
      <template v-for="event in flatEvents" :key="`footer-${event.id}`" #[`event-${event.id}-footer`]>
        <div :class="COMPONENTS.bookingGrid.summary">
          <span>{{ getEventSummary(event.id).ticketCounts }}</span>
          <span :class="COMPONENTS.bookingGrid.summaryPrice">{{ formatPrice(getEventSummary(event.id).totalPrice) }} kr</span>
        </div>
      </template>

      <!-- Expanded row: GuestBookingForm for guest-add row -->
      <template #expanded="{row}">
        <div v-if="row.original.rowType === BookingRow['guest-add'] && activeGuestEvent && props.bookerId" :class="COMPONENTS.bookingGrid.expandedPanel">
          <GuestBookingForm
            :household-id="props.household.id"
            :dinner-event="activeGuestEvent"
            :ticket-prices="props.ticketPrices"
            :allergy-types="props.allergyTypes"
            :deadlines="props.deadlines"
            :booker-id="props.bookerId"
            :booker-name="props.household.inhabitants.find(i => i.id === props.bookerId)?.name ?? 'Ukendt'"
            :released-ticket-counts="props.lockStatus.get(activeGuestEvent.id) ?? EMPTY_RELEASED_TICKET_COUNTS"
            :booking-context="contextOf(activeGuestEvent)"
            :admin-bypass="props.adminBypass"
            @save="handleGuestSave"
            @cancel="expanded = {}"
          />
        </div>
      </template>

      <!-- Footer: Cancel/Save buttons (ADR-016) - using body-bottom slot per NuxtUI docs -->
      <template v-if="formMode === FORM_MODES.EDIT" #body-bottom>
        <tr>
          <td :colspan="columns.length" :class="COMPONENTS.bookingGrid.actionCell">
            <!-- Kept to the part of the box in view: on a phone the table scrolls sideways under it -->
            <div :class="[COMPONENTS.bookingGrid.actionPanel, COMPONENTS.bookingGrid.actionStack]">
              <!-- Action preview: show what will happen when saving -->
              <ActionPreview :days="previewDays" :pending="isPreviewPending" />

              <!-- Buttons row -->
              <div :class="LAYOUTS.formButtonRow">
                <UButton
                  v-bind="BUTTONS.cancel"
                  :disabled="props.isSaving"
                  data-testid="grid-cancel"
                  @click="handleCancel"
                >
                  {{ BUTTON_WORDS.cancel }}
                </UButton>
                <UButton
                  v-if="canEdit"
                  v-bind="BUTTONS.save"
                  :disabled="!hasPendingChanges || props.isSaving"
                  :loading="props.isSaving"
                  data-testid="grid-save"
                  @click="handleSave"
                >
                  {{ props.isSaving ? 'Arbejder ...' : bookingSaveLabel(BookingActionSchema.enum.CHANGE_MODE) }}
                </UButton>
              </div>
            </div>
          </td>
        </tr>
      </template>
    </UTable>

    <!-- Legend: hidden in day view (DinnerBookingForm has its own) -->
    <DinnerModeLegend
      v-if="view !== View.day"
      show-modified
      :show-waitlist="waitlistEntries.length > 0"
      :show-birthday="inhabitantRows.some(({row}) => row.birthdayBadge)"
      hint="Klik på en celle for at ændre din booking, den cykler igennem mulighederne. Når du er færdig, husk at trykke gem."
      :class="COMPONENTS.bookingGrid.legend"
    />
  </div>
</template>
