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
 * │                  │(🟠)  │(🟡2) ║(🟠)  │      │      ║      │ <- chip: 🟠=locked, 🟡N=tickets
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
 * NAME CELL COUNTS over the dinners in view, each while above 0: 🎟️ the person's own tickets (booked and released),
 * 🔓 the released among them, ⌛ their own places on the waiting list (a guest's place is not theirs).
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
 * | inhabitant  | 👤   | Booking state  | Editable (future)   | An inhabitant      |
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
import type {DinnerEventDisplay, OrderDisplay, DinnerMode, DesiredOrder, ScaffoldOrdersRequest} from '~/composables/useBookingValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import type {AllergyTypeDisplay} from '~/composables/useAllergyValidation'
import type {SeasonDeadlines} from '~/composables/useSeason'
import type {TicketPresentation} from '~/composables/useBookingUi'
import type {BookingView} from '~/composables/useBookingView'
import type {DateRange} from '~/types/dateTypes'
import {EMPTY_RELEASED_TICKET_COUNTS, type BookingChanges, type BookingContext, type BookingIntent, type GuestBookingIntent, type ReleasedTicketCounts, type WaitlistEntryIntent} from '~/composables/useBooking'
import type {TicketWaitlistDetail} from '~/composables/useWaitlistValidation'
import {FORM_MODES, type FormMode} from '~/types/form'

// Row types for synthetic rows (same pattern as HouseholdCard)
type RowType = 'power' | 'inhabitant' | 'guest-order' | 'guest-add'

// Ticket config type (same as DinnerBookingForm)

interface GridRow {
  rowType: RowType
  id: number | string
  name: string
  inhabitant?: InhabitantDisplay // For inhabitant row, or booker for guest-order
  inhabitants?: InhabitantDisplay[] // For power mode
  guestOrders?: OrderDisplay[] // For grouped guest bookings (by booker+ticketType+event)
  waitlistEntry?: TicketWaitlistDetail // A queued guest's place
  dinnerEventId?: number // A guest row's dinner
  ticketConfig?: TicketPresentation | null // The row's ticket type: an inhabitant's by age, a guest's by its price
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

// Design system
const {ICONS, COLOR, SIZES, COMPONENTS, TYPOGRAPHY, BUTTONS, ALERTS, getRandomEmptyMessage, ORDER_STATE_COLORS, DINNER_STATE_BADGES, getResidencyDisplay, LAYOUTS, NOISE} = useTheSlopeDesignSystem()
const emptyState = getRandomEmptyMessage('noDinners')

// Ticket price formatting
const {formatPrice, resolveTicketPrice} = useTicket()

// Booking helpers (shared with DinnerBookingForm)
const {groupGuestOrders, getDayBillSummary, getBookingOptions, powerOptions, newGuestRow, buildDesiredOrders, buildGuestDesiredOrders, buildBookingChanges, getPowerChanges, getPowerConsensus} = useBooking()
const {lockChip} = useBookingUi()
const bookingsStore = useBookingsStore()

// Validation schemas
const {DinnerModeSchema, OrderStateSchema, DinnerStateSchema} = useBookingValidation()
const DinnerModeEnum = DinnerModeSchema.enum

// ============================================================================
// DRAFT STATE (ADR-016)
// ============================================================================

const draftChanges = ref<Map<string, DinnerMode>>(new Map())
// Keyed by the guest group's first order id: a guest ticket carries its booker's inhabitantId, so the cell key would collide with the booker's own cell
const guestDraftChanges = ref<Map<number, GuestBookingIntent>>(new Map())
const guestDraftKey = (guestOrders: OrderDisplay[]): number => guestOrders[0]!.id
// Keyed by the entry's id: a queued guest's place, from its own cell or the power cell
const entryDraftChanges = ref<Map<number, WaitlistEntryIntent>>(new Map())
const hasPendingChanges = computed(() => draftChanges.value.size + guestDraftChanges.value.size + entryDraftChanges.value.size > 0)

// A cell's change as the save sends it: a queued cell's names the person's place
const cellIntent = (inhabitantId: number, dinnerEventId: number, dinnerMode: DinnerMode): BookingIntent =>
  ({inhabitantId, dinnerEventId, dinnerMode, waitlistEntryId: getWaitlistEntryForCell(inhabitantId, dinnerEventId)?.id})

const draftBookingChanges = (): BookingChanges => ({
  intents: Array.from(draftChanges.value.entries()).map(([key, dinnerMode]) => {
    const [inhabitantId, dinnerEventId] = key.split('-').map(Number)
    return cellIntent(inhabitantId!, dinnerEventId!, dinnerMode)
  }),
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

const getOrderForCell = (inhabitantId: number, eventId: number): OrderDisplay | undefined =>
  findRegularOrder(props.orders, inhabitantId, eventId)

// A cell without a ticket may hold a queue entry; an order supersedes it
const getWaitlistEntryForCell = (inhabitantId: number, eventId: number): TicketWaitlistDetail | undefined =>
  getOrderForCell(inhabitantId, eventId) ? undefined : findRegularOrder(props.waitlistEntries, inhabitantId, eventId)

// A cell without an order or a queue entry shows the booking the preferences give it
const getExpectedMode = (inhabitantId: number, eventId: number): DinnerMode | undefined =>
  getOrderForCell(inhabitantId, eventId) || getWaitlistEntryForCell(inhabitantId, eventId)
    ? undefined
    : expectedModes.value.get(expectedBookingKey(inhabitantId, eventId))

// What the cell holds: its order, else its place's wish, else Ingen
const getHeldMode = (inhabitantId: number, eventId: number): DinnerMode =>
  getOrderForCell(inhabitantId, eventId)?.dinnerMode
    ?? getWaitlistEntryForCell(inhabitantId, eventId)?.order.dinnerMode
    ?? DinnerModeEnum.NONE

// A draft, else the plan of a cell that holds nothing, else what the cell holds
const getCellMode = (inhabitantId: number, eventId: number): DinnerMode =>
  draftChanges.value.get(expectedBookingKey(inhabitantId, eventId))
    ?? getExpectedMode(inhabitantId, eventId)
    ?? getHeldMode(inhabitantId, eventId)

const isCellModified = (inhabitantId: number, eventId: number): boolean =>
  draftChanges.value.has(expectedBookingKey(inhabitantId, eventId))

// A cell shows its expected booking ghosted until a draft takes its place
const isCellExpected = (inhabitantId: number, eventId: number): boolean =>
  !isCellModified(inhabitantId, eventId) && getExpectedMode(inhabitantId, eventId) !== undefined

// A draft equal to what the cell holds is no change; a plan holds nothing, so on it every mode is the person's intent
const handleCellUpdate = (inhabitantId: number, eventId: number, newMode: DinnerMode) => {
  const key = expectedBookingKey(inhabitantId, eventId)
  if (getExpectedMode(inhabitantId, eventId) === undefined && newMode === getHeldMode(inhabitantId, eventId)) {
    draftChanges.value.delete(key)
  } else {
    draftChanges.value.set(key, newMode)
  }
}

const getGuestCellMode = (guestOrders: OrderDisplay[]): DinnerMode =>
  guestDraftChanges.value.get(guestDraftKey(guestOrders))?.dinnerMode ?? guestOrders[0]!.dinnerMode

const isGuestCellModified = (guestOrders: OrderDisplay[]): boolean => guestDraftChanges.value.has(guestDraftKey(guestOrders))

const handleGuestCellUpdate = ({guestOrders, dinnerMode}: GuestBookingIntent) => {
  const key = guestDraftKey(guestOrders)
  if (dinnerMode === guestOrders[0]!.dinnerMode) {
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

// Track which event's + button was clicked (for GuestBookingForm context)
const activeGuestEventId = ref<number | null>(null)

// Expandable row state (single row at a time)
const {expanded} = useExpandableRow({
  onExpand: (rowIndex) => {
    // Row expanded - activeGuestEventId already set by handleGuestAdd
    const row = tableData.value[rowIndex]
    if (row?.rowType !== 'guest-add') {
      activeGuestEventId.value = null // Safety: only guest-add row should expand
    }
  },
  onCollapse: () => {
    activeGuestEventId.value = null
  }
})

// Get the row index for guest-add row (needed to toggle expansion)
const guestAddRowIndex = computed(() =>
  tableData.value.findIndex(r => r.rowType === 'guest-add')
)

// Handle + button click: set event context and expand row
const handleGuestAdd = (eventId: number) => {
  // Toggle expansion - the open dinner's chevron collapses, another dinner's switches the form to it
  const isOpenDinner = activeGuestEventId.value === eventId
  activeGuestEventId.value = eventId
  const rowIdx = guestAddRowIndex.value
  if (rowIdx >= 0) {
    if (expanded.value[rowIdx] && isOpenDinner) {
      expanded.value = {}
    } else {
      expanded.value = {[rowIdx]: true}
    }
  }
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

// Handle mode change from the view switcher (reserved for future use)
const _handleModeChange = (mode: FormMode) => {
  if (mode === FORM_MODES.VIEW && hasPendingChanges.value) {
    // If switching back to VIEW with pending changes, clear them
    clearDrafts()
  }
  emit('update:formMode', mode)
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

const householdOrder = computed(() => props.household.inhabitants.map(i => i.id))

// The bookings the scaffold will make on the dinners on view: its dry run with no orders, read again once the orders change.
// Every viewer reads them, on the season's deadlines
const expectedRequest = computed(() => props.view !== 'day' && flatEvents.value.length > 0
  ? {householdId: props.household.id, dinnerEventIds: flatEvents.value.map(e => e.id)}
  : null)
const {result: expectedRun, pending: isExpectedPending} = useScaffoldPreview(
  () => expectedRequest.value,
  ({householdId, dinnerEventIds}) => bookingsStore.fetchExpectedBookings(householdId, dinnerEventIds),
  {refreshOn: [() => props.orders]}
)
const expectedModes = computed(() => expectedBookings(expectedRun.value))

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
const previewDays = computed(() => preview.value ? formatPreviewLines(preview.value, householdOrder.value) : [])

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

// The guest rows, as the day view builds them: a placed group (booker, ticket type, dinner), then one row per queued
// guest; a guest has no birth date, so the price the orders or the place hold names the ticket type
const guestRows = computed((): GridRow[] => {
  // The orders and the waiting list reach past the range (the season's locked dinners): a row needs its dinner's column
  const onView = new Set(flatEvents.value.map(event => event.id))
  const bookerOf = (inhabitantId: number) => props.household.inhabitants.find(i => i.id === inhabitantId)
  const presentationOf = (ticketPrice: TicketPrice | undefined) => ticketPrice ? ticketTypePresentation(ticketPrice.ticketType) : null
  const placed = Object.entries(groupGuestOrders(props.orders.filter(order => onView.has(order.dinnerEventId)))).map(([key, orders]): GridRow => ({
    rowType: 'guest-order',
    id: `guest-group-${key}`,
    name: 'Gæst',
    inhabitant: bookerOf(orders[0]!.inhabitantId),
    guestOrders: orders,
    dinnerEventId: orders[0]!.dinnerEventId,
    ticketConfig: presentationOf(resolveTicketPrice(null, orders[0]!.priceAtBooking, props.ticketPrices)),
    guestCount: orders.length,
    isSynthetic: false
  }))
  const queued = props.waitlistEntries.filter(entry => entry.isGuestTicket && onView.has(entry.dinnerEventId)).map((entry): GridRow => ({
    rowType: 'guest-order',
    id: `guest-entry-${entry.id}`,
    name: 'Gæst',
    inhabitant: bookerOf(entry.inhabitantId),
    waitlistEntry: entry,
    dinnerEventId: entry.dinnerEventId,
    ticketConfig: presentationOf(props.ticketPrices.find(price => price.id === entry.order.ticketPriceId)),
    guestCount: 1,
    isSynthetic: false
  }))
  return [...placed, ...queued]
})

const tableData = computed((): GridRow[] => {
  // No dinners in the period means no grid: the synthetic power row would otherwise keep
  // the table populated and its #empty slot unreachable.
  if (flatEvents.value.length === 0) return []

  const inhabitants = props.household.inhabitants
  const rows: GridRow[] = []

  // Power row - ALWAYS shown (consensus in VIEW, editable in EDIT)
  rows.push({
    rowType: 'power',
    id: 'power-mode',
    name: 'Alle',
    inhabitants,
    isSynthetic: true
  })

  // Inhabitant rows
  inhabitants.forEach(inhabitant => {
    rows.push({
      rowType: 'inhabitant',
      id: inhabitant.id,
      name: inhabitant.name,
      inhabitant,
      ticketConfig: resolveTicketTypePresentation(inhabitant.birthDate ?? null, props.ticketPrices),
      isSynthetic: false
    })
  })

  rows.push(...guestRows.value)

  // Guest add row - only in EDIT mode
  if (props.formMode === FORM_MODES.EDIT) {
    rows.push({
      rowType: 'guest-add',
      id: 'guest-add',
      name: 'Tilføj gæst',
      isSynthetic: true
    })
  }

  return rows
})

// ============================================================================
// HELPERS
// ============================================================================

// The name cell's counts over the dinners in view, one entry per inhabitant
const countsByInhabitant = computed(() => {
  const eventIds = flatEvents.value.map(e => e.id)
  return new Map(householdInhabitantIds.value.map(inhabitantId =>
    [inhabitantId, personTicketCounts(inhabitantId, eventIds, props.orders, props.waitlistEntries)]))
})
const NO_COUNTS = {total: 0, released: 0, queued: 0}
const countsOf = (inhabitantId: number) => countsByInhabitant.value.get(inhabitantId) ?? NO_COUNTS

// The consensus of the modes the cells show: a draft, else an expected cell's expected mode; a place counts its wish
const getEventConsensus = (eventId: number): { value: DinnerMode, consensus: boolean } =>
  getPowerConsensus(householdInhabitantIds.value, props.orders, props.waitlistEntries, eventId, {
    inhabitant: inhabitantId => draftChanges.value.get(expectedBookingKey(inhabitantId, eventId)) ?? getExpectedMode(inhabitantId, eventId),
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

const {isDinnerPast} = useSeason()
const {canModifyOrders} = props.deadlines

const canBookEvent = (event: DinnerEventDisplay): boolean => canModifyOrders(event.date)

const isHouseholdInResidency = isHouseholdActiveOnDay(props.household.movedInDate, props.household.moveOutDate)

const contextOf = (event: DinnerEventDisplay): BookingContext => ({event, deadlines: props.deadlines, isHouseholdInResidency})

// Each candidate is the desired order the save sends for the cell in a mode (buildBookingChanges' builders).
// The cell slots render inside UTable's render: a fresh array per render makes every selector patch on every click, one array per cell lets Vue skip the untouched ones
const enabledModesByCell = computed(() => {
  const eventById = new Map(flatEvents.value.map(event => [event.id, event]))
  const inhabitantCells = flatEvents.value.flatMap(event => props.household.inhabitants.map(({id}) => [
    expectedBookingKey(id, event.id),
    getBookingOptions({
      order: getOrderForCell(id, event.id) ?? null,
      waitlistEntry: getWaitlistEntryForCell(id, event.id) ?? null,
      candidate: dinnerMode => buildDesiredOrders([cellIntent(id, event.id, dinnerMode)], props.orders, props.household.inhabitants, props.dinnerEvents, props.ticketPrices)[0] ?? null
    }, contextOf(event))
  ] as const))
  const cells = new Map<string, DinnerMode[]>(inhabitantCells)
  const guestCells = guestRows.value.flatMap(({id, guestOrders, waitlistEntry, dinnerEventId}) => {
    const event = eventById.get(dinnerEventId!)
    if (!event) return []
    const row = waitlistEntry
      ? {order: null, waitlistEntry, candidate: (dinnerMode: DinnerMode) => buildEntryDesiredOrder({entry: waitlistEntry, dinnerMode}, OrderStateSchema.enum.BOOKED)}
      : {order: guestOrders![0]!, waitlistEntry: null, candidate: (dinnerMode: DinnerMode) => buildGuestDesiredOrders([{guestOrders: guestOrders!, dinnerMode}], props.ticketPrices)[0] ?? null}
    return [[String(id), getBookingOptions(row, contextOf(event))] as const]
  })
  const eventCells = flatEvents.value.flatMap(event => [
    [`power-${event.id}`, powerOptions(props.household.inhabitants.map(({id}) => cells.get(expectedBookingKey(id, event.id))!))] as const,
    [`guest-add-${event.id}`, getBookingOptions(newGuestRow(props.bookerId, event.id, props.ticketPrices), contextOf(event))] as const
  ])
  return new Map<string, DinnerMode[]>([...inhabitantCells, ...guestCells, ...eventCells])
})
const getCellModes = (inhabitantId: number, eventId: number): DinnerMode[] =>
  enabledModesByCell.value.get(expectedBookingKey(inhabitantId, eventId))!
const getGuestModes = (row: GridRow): DinnerMode[] => enabledModesByCell.value.get(String(row.id)) ?? []
const getPowerModes = (event: DinnerEventDisplay): DinnerMode[] => enabledModesByCell.value.get(`power-${event.id}`)!
const getNewGuestModes = (event: DinnerEventDisplay): DinnerMode[] => enabledModesByCell.value.get(`guest-add-${event.id}`)!

// A cell without a mode to pick shows its view face; in edit mode the others toggle through theirs
const cellFormMode = (modes: DinnerMode[]): FormMode => modes.length === 0 ? FORM_MODES.VIEW : effectiveFormMode.value
const cellInteraction = (modes: DinnerMode[]) => cellFormMode(modes) === FORM_MODES.EDIT ? 'toggle' : 'buttons'

// A column the household cannot book: no mode in its power cell (past, outside residency, cancelled or consumed)
const isEventDisabled = (event: DinnerEventDisplay): boolean => getPowerModes(event).length === 0

// Nothing lands on a cancelled dinner: its header shows the state badge, its cells their tickets on the cancelled face
const isCancelledEvent = (event: DinnerEventDisplay): boolean => event.state === DinnerStateSchema.enum.CANCELLED

// Residency alert: shown when any visible event falls outside residency
const residencyAlert = computed(() => {
  const hasDisabledByResidency = flatEvents.value.some(e => !isHouseholdInResidency(e.date))
  if (!hasDisabledByResidency) return null
  return getResidencyDisplay(props.household.movedInDate, props.household.moveOutDate)
})

// The column header's lock chip on a locked dinner counts the household's own released tickets: it waits with the rows
const getEventLockChip = (event: DinnerEventDisplay) => {
  if (props.loading || canBookEvent(event) || isDinnerPast(event.date)) return null
  const releasedCount = props.orders.filter(o =>
    o.dinnerEventId === event.id && ticketStateOf(o) === TicketState.released
  ).length
  return lockChip({...EMPTY_RELEASED_TICKET_COUNTS, total: releasedCount})
}

// ============================================================================
// NAVIGATION
// ============================================================================

const navigationLabel = computed(() => {
  if (!props.dateRange.start || !props.dateRange.end) return ''

  switch (props.view) {
    case 'day': return formatFullWeekdayDate(props.dateRange.start)
    case 'week': return formatWeekRange(props.dateRange.start, props.dateRange.end)
    default: return formatMonthYear(props.dateRange.start)
  }
})

// ============================================================================
// GUEST ORDERS
// ============================================================================


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
          v-if="view !== 'day' && formMode === FORM_MODES.VIEW && canEdit"
          v-bind="BUTTONS.edit"
          :disabled="props.isSaving"
          data-testid="grid-edit"
          @click="emit('update:formMode', FORM_MODES.EDIT)"
        />
      </div>
    </div>

    <!-- Residency alert: grid views only (week/month). Day view delegates to DinnerBookingForm. -->
    <UAlert
      v-if="residencyAlert && view !== 'day'"
      v-bind="ALERTS[residencyAlert.color]"
      :icon="residencyAlert.icon"
      :title="residencyAlert.alertTitle"
      :description="residencyAlert.alertDescription"
      data-testid="outside-residency-alert"
      :class="COMPONENTS.bookingGrid.alert"
    />

    <!-- Day view: slot for DinnerBookingForm -->
    <div v-if="view === 'day'" :class="COMPONENTS.bookingGrid.dayContent">
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
      row-key="id"
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
            {{ view === 'week' ? 'Ingen middage denne uge' : 'Ingen middage denne måned' }}
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
              v-if="isCancelledEvent(event)"
              :color="DINNER_STATE_BADGES.CANCELLED.color"
              :icon="DINNER_STATE_BADGES.CANCELLED.icon"
              :variant="NOISE.subtle"
              :size="SIZES.small"
            >
              {{ DINNER_STATE_BADGES.CANCELLED.label }}
            </UBadge>
            <UChip
              v-else-if="getEventLockChip(event)"
              v-bind="COMPONENTS.bookingGrid.lockChip"
              :color="getEventLockChip(event)!.color"
              :text="getEventLockChip(event)!.text"
            />
          </div>
        </div>
      </template>

      <!-- Name column -->
      <template #name-cell="{row}">
        <!-- Power row -->
        <div v-if="row.original.rowType === 'power'" :class="COMPONENTS.bookingGrid.powerName">
          <UIcon :name="COMPONENTS.powerMode.buttonIcon" :class="COMPONENTS.powerMode.iconClass" />
          <UBadge :color="COMPONENTS.powerMode.color" :variant="NOISE.subtle" :size="SIZES.sm">
            POWERMODE!
          </UBadge>
        </div>
        <!-- Inhabitant row: user + ticket count badge + released badge + waiting-list badge -->
        <div v-else-if="row.original.rowType === 'inhabitant' && row.original.inhabitant" :class="COMPONENTS.bookingGrid.inhabitantName">
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
                {{ row.original.ticketConfig.label }}
              </UBadge>
            </template>
          </UserListItem>
          <!-- Ticket count badge (only if > 0) -->
          <UBadge
            v-if="countsOf(row.original.inhabitant.id).total > 0"
            :data-testid="`inhabitant-ticket-count-${row.original.inhabitant.id}`"
            :color="COLOR.neutral"
            :variant="NOISE.soft"
            :size="SIZES.xs"
          >
            <UIcon :name="ICONS.ticket" :class="COMPONENTS.bookingGrid.countIcon" />
            {{ countsOf(row.original.inhabitant.id).total }}
          </UBadge>
          <!-- Released badge (only if > 0) -->
          <UBadge
            v-if="countsOf(row.original.inhabitant.id).released > 0"
            :data-testid="`inhabitant-released-count-${row.original.inhabitant.id}`"
            :color="ORDER_STATE_COLORS[TicketState.released]"
            :variant="NOISE.soft"
            :size="SIZES.xs"
          >
            <UIcon :name="ICONS.released" :class="COMPONENTS.bookingGrid.countIcon" />
            {{ countsOf(row.original.inhabitant.id).released }}
          </UBadge>
          <!-- Waiting-list badge (only if > 0) -->
          <UBadge
            v-if="countsOf(row.original.inhabitant.id).queued > 0"
            :data-testid="`inhabitant-waitlist-count-${row.original.inhabitant.id}`"
            :color="ORDER_STATE_COLORS[TicketState.queued]"
            :variant="NOISE.soft"
            :size="SIZES.xs"
          >
            <UIcon :name="ICONS.waitlist" :class="COMPONENTS.bookingGrid.countIcon" />
            {{ countsOf(row.original.inhabitant.id).queued }}
          </UBadge>
        </div>
        <!-- Guest order row - show who invited using UserListItem (same as DinnerBookingForm) -->
        <div v-else-if="row.original.rowType === 'guest-order'" :class="COMPONENTS.bookingGrid.guestName">
          <UIcon :name="ICONS.userPlus" :class="COMPONENTS.bookingGrid.guestIcon" />
          <span :class="COMPONENTS.bookingGrid.guestLabel">Gæst af</span>
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
                {{ guestTicketsLabel(row.original.ticketConfig.label, row.original.guestCount ?? 1) }}
              </UBadge>
            </template>
          </UserListItem>
          <span v-else :class="COMPONENTS.bookingGrid.guestUnknown">ukendt</span>
        </div>
        <!-- Guest add row -->
        <div v-else-if="row.original.rowType === 'guest-add'" :class="COMPONENTS.bookingGrid.guestAddName">
          <UIcon :name="COMPONENTS.guestRow.addIcon" :class="COMPONENTS.guestRow.iconClass" />
          <span :class="COMPONENTS.bookingGrid.guestAddLabel">{{ row.original.name }}</span>
        </div>
      </template>

      <!-- Dynamic event columns - cells -->
      <template v-for="event in flatEvents" :key="event.id" #[`event-${event.id}-cell`]="{row}">
        <!-- Power row: consensus mode or ? (DinnerModeSelector handles both) -->
        <DinnerModeSelector
          v-if="row.original.rowType === 'power'"
          :model-value="getEventConsensus(event.id).value"
          :form-mode="cellFormMode(getPowerModes(event))"
          :interaction="cellInteraction(getPowerModes(event))"
          :enabled-modes="getPowerModes(event)"
          :consensus="getEventConsensus(event.id).consensus"
          :expected="isPowerExpected(event.id)"
          :cancelled="isCancelledEvent(event)"
          :size="SIZES.standard"
          :name="`power-${event.id}`"
          @update:model-value="(mode: DinnerMode) => handlePowerUpdate(event.id, mode)"
        />
        <!-- Inhabitant row, queued: the wish ghosted under the hourglass until a draft takes its place -->
        <UChip
          v-else-if="row.original.rowType === 'inhabitant' && row.original.inhabitant && getWaitlistEntryForCell(row.original.inhabitant.id, event.id)"
          v-bind="COMPONENTS.waitlist.chip"
          :data-testid="`grid-waitlist-${row.original.inhabitant.id}-${event.id}`"
        >
          <DinnerModeSelector
            :model-value="getCellMode(row.original.inhabitant.id, event.id)"
            :form-mode="cellFormMode(getCellModes(row.original.inhabitant.id, event.id))"
            :interaction="cellInteraction(getCellModes(row.original.inhabitant.id, event.id))"
            :enabled-modes="getCellModes(row.original.inhabitant.id, event.id)"
            :cancelled="isCancelledEvent(event)"
            :size="SIZES.standard"
            :name="`cell-${row.original.inhabitant.id}-${event.id}`"
            :is-modified="isCellModified(row.original.inhabitant.id, event.id)"
            :ghost="!isCellModified(row.original.inhabitant.id, event.id)"
            @update:model-value="(mode: DinnerMode) => handleCellUpdate(row.original.inhabitant!.id, event.id, mode)"
          />
          <template #content>
            <UIcon :name="ICONS.waitlist" :class="COMPONENTS.waitlist.chipIcon" />
          </template>
        </UChip>
        <!-- Inhabitant row -->
        <DinnerModeSelector
          v-else-if="row.original.rowType === 'inhabitant' && row.original.inhabitant"
          :model-value="getCellMode(row.original.inhabitant.id, event.id)"
          :form-mode="cellFormMode(getCellModes(row.original.inhabitant.id, event.id))"
          :interaction="cellInteraction(getCellModes(row.original.inhabitant.id, event.id))"
          :enabled-modes="getCellModes(row.original.inhabitant.id, event.id)"
          :cancelled="isCancelledEvent(event)"
          :size="SIZES.standard"
          :name="`cell-${row.original.inhabitant.id}-${event.id}`"
          :is-modified="isCellModified(row.original.inhabitant.id, event.id)"
          :expected="isCellExpected(row.original.inhabitant.id, event.id)"
          @update:model-value="(mode: DinnerMode) => handleCellUpdate(row.original.inhabitant!.id, event.id, mode)"
        />
        <!-- Guest row, queued: the guest's wish ghosted under the hourglass, as a queued inhabitant's -->
        <UChip
          v-else-if="row.original.rowType === 'guest-order' && row.original.waitlistEntry && row.original.dinnerEventId === event.id"
          v-bind="COMPONENTS.waitlist.chip"
          :data-testid="`grid-waitlist-${row.original.id}-${event.id}`"
        >
          <DinnerModeSelector
            :model-value="getEntryCellMode(row.original.waitlistEntry)"
            :form-mode="cellFormMode(getGuestModes(row.original))"
            :interaction="cellInteraction(getGuestModes(row.original))"
            :enabled-modes="getGuestModes(row.original)"
            :cancelled="isCancelledEvent(event)"
            :size="SIZES.standard"
            :name="`guest-${row.original.id}-${event.id}`"
            :is-modified="isEntryCellModified(row.original.waitlistEntry)"
            :ghost="!isEntryCellModified(row.original.waitlistEntry)"
            @update:model-value="(mode: DinnerMode) => handleEntryUpdate({entry: row.original.waitlistEntry!, dinnerMode: mode})"
          />
          <template #content>
            <UIcon :name="ICONS.waitlist" :class="COMPONENTS.waitlist.chipIcon" />
          </template>
        </UChip>
        <!-- Guest order row: a group holds the guest tickets of one dinner -->
        <DinnerModeSelector
          v-else-if="row.original.rowType === 'guest-order' && row.original.guestOrders && row.original.dinnerEventId === event.id"
          :model-value="getGuestCellMode(row.original.guestOrders)"
          :form-mode="cellFormMode(getGuestModes(row.original))"
          :interaction="cellInteraction(getGuestModes(row.original))"
          :enabled-modes="getGuestModes(row.original)"
          :cancelled="isCancelledEvent(event)"
          :size="SIZES.standard"
          :name="`guest-${row.original.id}-${event.id}`"
          :is-modified="isGuestCellModified(row.original.guestOrders)"
          @update:model-value="(mode: DinnerMode) => handleGuestCellUpdate({guestOrders: row.original.guestOrders!, dinnerMode: mode})"
        />
        <!-- Guest add row: a chevron per dinner a new guest may take a mode on, turned up while its form is open below -->
        <UButton
          v-else-if="row.original.rowType === 'guest-add' && getNewGuestModes(event).length > 0"
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
        <div v-if="row.original.rowType === 'guest-add' && activeGuestEvent && props.bookerId" :class="COMPONENTS.bookingGrid.expandedPanel">
          <GuestBookingForm
            :household-id="props.household.id"
            :dinner-event="activeGuestEvent"
            :ticket-prices="props.ticketPrices"
            :allergy-types="props.allergyTypes"
            :deadlines="props.deadlines"
            :booker-id="props.bookerId"
            :booker-name="props.household.inhabitants.find(i => i.id === props.bookerId)?.name ?? 'Ukendt'"
            :released-ticket-counts="props.lockStatus.get(activeGuestEvent.id) ?? EMPTY_RELEASED_TICKET_COUNTS"
            :is-household-in-residency="isHouseholdInResidency(activeGuestEvent.date)"
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
                  Annuller
                </UButton>
                <UButton
                  v-if="canEdit"
                  v-bind="BUTTONS.save"
                  :disabled="!hasPendingChanges || props.isSaving"
                  :loading="props.isSaving"
                  data-testid="grid-save"
                  @click="handleSave"
                >
                  {{ props.isSaving ? 'Arbejder ...' : 'Opdater' }}
                </UButton>
              </div>
            </div>
          </td>
        </tr>
      </template>
    </UTable>

    <!-- Legend: hidden in day view (DinnerBookingForm has its own) -->
    <DinnerModeLegend
      v-if="view !== 'day'"
      show-modified
      :show-waitlist="waitlistEntries.length > 0"
      hint="Klik på en celle for at ændre din booking, den cykler igennem mulighederne. Når du er færdig, husk at trykke gem."
      :class="COMPONENTS.bookingGrid.legend"
    />
  </div>
</template>
