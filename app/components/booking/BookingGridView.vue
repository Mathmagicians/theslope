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
 * DAY VIEW: the day-content slot holds DinnerBookingForm (HouseholdBookings). On a phone the household card body has no
 * side padding; the slot (COMPONENTS.bookingGrid.dayContent) carries a card body's, so the form's table keeps its width
 * and scrolls sideways in its box.
 *
 * Visual check: /household/<S>/bookings at 375px and desktop. Week and month: the name cell's three counts. Edit mode on
 * a phone: a guest chevron on a dinner past the first screen opens the form in view. Day view on a phone: the page keeps
 * its width and the form's table scrolls in its box.
 *
 * ROW TYPES:
 * | Row Type    | Icon | VIEW           | EDIT                | Description        |
 * |-------------|------|----------------|---------------------|--------------------|
 * | power       | ⚡   | Consensus/?    | Editable (future)   | Bulk update all    |
 * | inhabitant  | 👤   | Booking state  | Editable (future)   | An inhabitant      |
 * | guest-order | 🎫   | Booking state  | Locked past, edit   | Existing guest     |
 * | guest-add   | ➕   | Hidden         | v buttons (future)  | Add new guest      |
 *
 * QUEUED CELL (a sold-out dinner, the inhabitant on the waiting list), read-only in both modes:
 *   ┌──────┐
 *   │  ⌛ │  the wished mode ghosted (COMPONENTS.waitlist.ghostBadge) under the hourglass in the corner chip
 *   └──────┘  (COMPONENTS.waitlist.chip); the legend gains "På venteliste (#n)" while the household has entries.
 *   A ticket for sale after the deadline keeps the claim: the cell toggles through the eating modes as before.
 *   The power cell reaches every place the household holds on the dinner, a queued guest's too (it has no row): the
 *   wishes count in its consensus, as an expected cell counts its expected mode, and its Ingen leaves the places.
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
 * Ingen; the legend gains "Forventet bestilling ifølge præferencer" while one shows, and the table's loading bar runs
 * while the read loads. A draft on an expected cell previews as a cancellation or a booking:
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
 */
import type {HouseholdDetail, InhabitantDisplay} from '~/composables/useCoreValidation'
import type {DinnerEventDisplay, OrderDisplay, DinnerMode, DesiredOrder, ScaffoldOrdersRequest} from '~/composables/useBookingValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import type {AllergyTypeDisplay} from '~/composables/useAllergyValidation'
import type {SeasonDeadlines} from '~/composables/useSeason'
import type {TicketPresentation} from '~/composables/useBookingUi'
import type {BookingView} from '~/composables/useBookingView'
import type {DateRange} from '~/types/dateTypes'
import {EMPTY_RELEASED_TICKET_COUNTS, type BookingChanges, type GuestBookingIntent, type ReleasedTicketCounts, type WaitlistEntryIntent} from '~/composables/useBooking'
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
  ticketConfig?: TicketPresentation | null // The row's ticket type: an inhabitant's by age, a guest group's by its price
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
const {ICONS, COLOR, SIZES, COMPONENTS, TYPOGRAPHY, BUTTONS, ALERTS, getRandomEmptyMessage, ORDER_STATE_COLORS, getResidencyDisplay, LAYOUTS, NOISE} = useTheSlopeDesignSystem()
const emptyState = getRandomEmptyMessage('noDinners')

// Ticket price formatting
const {formatPrice, resolveTicketPrice} = useTicket()

// Booking helpers (shared with DinnerBookingForm)
const {groupGuestOrders, getDayBillSummary, getBookingOptions, buildBookingChanges, getPowerChanges, getPowerConsensus} = useBooking()
const {lockChip} = useBookingUi()
const bookingsStore = useBookingsStore()

// Validation schemas
const {DinnerModeSchema} = useBookingValidation()
const DinnerModeEnum = DinnerModeSchema.enum

// ============================================================================
// DRAFT STATE (ADR-016)
// ============================================================================

const draftChanges = ref<Map<string, DinnerMode>>(new Map())
// Keyed by the guest group's first order id: a guest ticket carries its booker's inhabitantId, so the cell key would collide with the booker's own cell
const guestDraftChanges = ref<Map<number, GuestBookingIntent>>(new Map())
const guestDraftKey = (guestOrders: OrderDisplay[]): number => guestOrders[0]!.id
// Keyed by the entry's id: a queued guest has no cell, only the power cell reaches its place
const entryDraftChanges = ref<Map<number, WaitlistEntryIntent>>(new Map())
const hasPendingChanges = computed(() => draftChanges.value.size + guestDraftChanges.value.size + entryDraftChanges.value.size > 0)

const draftBookingChanges = (): BookingChanges => ({
  intents: Array.from(draftChanges.value.entries()).map(([key, dinnerMode]) => {
    const [inhabitantId, dinnerEventId] = key.split('-').map(Number)
    // A queued cell's change names the person's place
    return {inhabitantId: inhabitantId!, dinnerEventId: dinnerEventId!, dinnerMode, waitlistEntryId: getWaitlistEntryForCell(inhabitantId!, dinnerEventId!)?.id}
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

// A draft differs from what the cell holds: its order, else its place's wish, else its expected booking, else Ingen
const getServerMode = (inhabitantId: number, eventId: number): DinnerMode =>
  getOrderForCell(inhabitantId, eventId)?.dinnerMode
    ?? getWaitlistEntryForCell(inhabitantId, eventId)?.order.dinnerMode
    ?? getExpectedMode(inhabitantId, eventId)
    ?? DinnerModeEnum.NONE

const getCellMode = (inhabitantId: number, eventId: number): DinnerMode =>
  draftChanges.value.get(expectedBookingKey(inhabitantId, eventId)) ?? getServerMode(inhabitantId, eventId)

const isCellModified = (inhabitantId: number, eventId: number): boolean =>
  draftChanges.value.has(expectedBookingKey(inhabitantId, eventId))

// A cell shows its expected booking ghosted until a draft takes its place
const isCellExpected = (inhabitantId: number, eventId: number): boolean =>
  !isCellModified(inhabitantId, eventId) && getExpectedMode(inhabitantId, eventId) !== undefined

const handleCellUpdate = (inhabitantId: number, eventId: number, newMode: DinnerMode) => {
  const key = expectedBookingKey(inhabitantId, eventId)
  const serverMode = getServerMode(inhabitantId, eventId)
  if (newMode === serverMode) {
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

const handleEntryUpdate = ({entry, dinnerMode}: WaitlistEntryIntent) => {
  if (dinnerMode === entry.order.dinnerMode) {
    entryDraftChanges.value.delete(entry.id)
  } else {
    entryDraftChanges.value.set(entry.id, {entry, dinnerMode})
  }
}

const householdInhabitantIds = computed(() => props.household.inhabitants.map(i => i.id))

const handlePowerUpdate = (eventId: number, newMode: DinnerMode) => {
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
  activeGuestEventId.value = eventId
  // Toggle expansion - if already expanded for same event, collapse
  const rowIdx = guestAddRowIndex.value
  if (rowIdx >= 0) {
    if (expanded.value[rowIdx] && activeGuestEventId.value === eventId) {
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

// The bookings the scaffold will make on the dinners on view: its dry run with no orders, read again once the orders change
const expectedRequest = computed((): ScaffoldOrdersRequest | null => props.view !== 'day' && flatEvents.value.length > 0
  ? {householdId: props.household.id, dinnerEventIds: flatEvents.value.map(e => e.id), orders: []}
  : null)
const {result: expectedRun, pending: isExpectedPending} = useScaffoldPreview(
  () => expectedRequest.value,
  request => bookingsStore.previewBookings(request),
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

// The legend explains a ghosted expected cell while one shows
const hasExpectedCell = computed(() => flatEvents.value.some(event =>
  props.household.inhabitants.some(inhabitant => isCellExpected(inhabitant.id, event.id))))

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

  // Guest order rows - grouped by (booker, ticketType, eventId) - same pattern as DinnerBookingForm
  const guestGroups = groupGuestOrders(props.orders)
  Object.entries(guestGroups).forEach(([key, orders]) => {
    const firstOrder = orders[0]!
    const booker = inhabitants.find(i => i.id === firstOrder.inhabitantId)
    // Resolve ticket price for guest: no birthDate, use priceAtBooking
    const resolvedTicketPrice = resolveTicketPrice(null, firstOrder.priceAtBooking, props.ticketPrices)

    rows.push({
      rowType: 'guest-order',
      id: `guest-group-${key}`,
      name: 'Gæst',
      inhabitant: booker, // The booker
      guestOrders: orders,
      ticketConfig: resolvedTicketPrice ? ticketTypePresentation(resolvedTicketPrice.ticketType) : null,
      guestCount: orders.length,
      isSynthetic: false
    })
  })

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

// The name cell's counts over the dinners in view: the person's own tickets, the released among them, their queued cells
const getCountsForInhabitant = (inhabitantId: number): { total: number, released: number, queued: number } => {
  const orders = flatEvents.value
    .flatMap(e => getOrderForCell(inhabitantId, e.id) ?? [])
    .filter(isPendingOrder)
  return {
    total: orders.length,
    released: orders.filter(o => ticketStateOf(o) === TicketState.released).length,
    queued: flatEvents.value.filter(e => getWaitlistEntryForCell(inhabitantId, e.id)).length
  }
}

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
// DEADLINE LOGIC (same pattern as DinnerBookingForm)
// ============================================================================

const {isDinnerPast} = useSeason()
const {canModifyOrders, canEditDiningMode} = props.deadlines

const canBookEvent = (event: DinnerEventDisplay): boolean => canModifyOrders(event.date)
const canChangeEventMode = (event: DinnerEventDisplay): boolean => canEditDiningMode(event.date)

const ALL_MODES: DinnerMode[] = [DinnerModeEnum.DINEIN, DinnerModeEnum.DINEINLATE, DinnerModeEnum.TAKEAWAY, DinnerModeEnum.NONE]

const isHouseholdInResidency = isHouseholdActiveOnDay(props.household.movedInDate, props.household.moveOutDate)

const isEventDisabled = (event: DinnerEventDisplay): boolean =>
  isDinnerPast(event.date) || !isHouseholdInResidency(event.date)

const getDisabledModes = (order: OrderDisplay | undefined, event: DinnerEventDisplay): DinnerMode[] => {
  if (isDinnerPast(event.date)) return ALL_MODES

  const {enabledModes} = getBookingOptions(
    order ?? null,
    canBookEvent(event),
    canChangeEventMode(event),
    event.state,
    isHouseholdInResidency(event.date)
  )
  return ALL_MODES.filter(m => !enabledModes.includes(m))
}

// The cell slots render inside UTable's render: a fresh array per render makes every selector patch on every click, one array per cell lets Vue skip the untouched ones
const disabledModesByCell = computed(() => new Map(
  flatEvents.value.flatMap(event => props.household.inhabitants.map(inhabitant =>
    [expectedBookingKey(inhabitant.id, event.id), getDisabledModes(getOrderForCell(inhabitant.id, event.id), event)] as const))
))
const getCellDisabledModes = (inhabitantId: number, eventId: number): DinnerMode[] =>
  disabledModesByCell.value.get(expectedBookingKey(inhabitantId, eventId))!

const disabledModesByGuestGroup = computed(() => new Map(
  Object.values(groupGuestOrders(props.orders)).flatMap(guestOrders => {
    const event = flatEvents.value.find(e => e.id === guestOrders[0]!.dinnerEventId)
    return event ? [[guestDraftKey(guestOrders), getDisabledModes(guestOrders[0], event)] as const] : []
  })
))
const getGuestDisabledModes = (guestOrders: OrderDisplay[]): DinnerMode[] =>
  disabledModesByGuestGroup.value.get(guestDraftKey(guestOrders))!

// Residency alert: shown when any visible event falls outside residency
const residencyAlert = computed(() => {
  const hasDisabledByResidency = flatEvents.value.some(e => !isHouseholdInResidency(e.date))
  if (!hasDisabledByResidency) return null
  return getResidencyDisplay(props.household.movedInDate, props.household.moveOutDate)
})

const getPowerDisabledModes = (event: DinnerEventDisplay): DinnerMode[] => {
  const firstInhabitant = props.household.inhabitants[0]
  if (!firstInhabitant) return ALL_MODES
  return getCellDisabledModes(firstInhabitant.id, event.id)
}

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
          <!-- Fixed height slot for chip: 🟠=locked, 🟡N=locked with N tickets -->
          <div :class="COMPONENTS.bookingGrid.chipSlot">
            <UChip
              v-if="getEventLockChip(event)"
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
            v-if="getCountsForInhabitant(row.original.inhabitant.id).total > 0"
            :data-testid="`inhabitant-ticket-count-${row.original.inhabitant.id}`"
            :color="COLOR.neutral"
            :variant="NOISE.soft"
            :size="SIZES.xs"
          >
            <UIcon :name="ICONS.ticket" :class="COMPONENTS.bookingGrid.countIcon" />
            {{ getCountsForInhabitant(row.original.inhabitant.id).total }}
          </UBadge>
          <!-- Released badge (only if > 0) -->
          <UBadge
            v-if="getCountsForInhabitant(row.original.inhabitant.id).released > 0"
            :data-testid="`inhabitant-released-count-${row.original.inhabitant.id}`"
            :color="ORDER_STATE_COLORS[TicketState.released]"
            :variant="NOISE.soft"
            :size="SIZES.xs"
          >
            <UIcon :name="ICONS.released" :class="COMPONENTS.bookingGrid.countIcon" />
            {{ getCountsForInhabitant(row.original.inhabitant.id).released }}
          </UBadge>
          <!-- Waiting-list badge (only if > 0) -->
          <UBadge
            v-if="getCountsForInhabitant(row.original.inhabitant.id).queued > 0"
            :data-testid="`inhabitant-waitlist-count-${row.original.inhabitant.id}`"
            :color="ORDER_STATE_COLORS[TicketState.queued]"
            :variant="NOISE.soft"
            :size="SIZES.xs"
          >
            <UIcon :name="ICONS.waitlist" :class="COMPONENTS.bookingGrid.countIcon" />
            {{ getCountsForInhabitant(row.original.inhabitant.id).queued }}
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
          :form-mode="isEventDisabled(event) ? FORM_MODES.VIEW : effectiveFormMode"
          :interaction="effectiveFormMode === FORM_MODES.EDIT && !isEventDisabled(event) ? 'toggle' : 'buttons'"
          :disabled-modes="getPowerDisabledModes(event)"
          :consensus="getEventConsensus(event.id).consensus"
          :size="SIZES.standard"
          :name="`power-${event.id}`"
          @update:model-value="(mode: DinnerMode) => handlePowerUpdate(event.id, mode)"
        />
        <!-- Inhabitant row, queued: the wish ghosted under the hourglass, read-only -->
        <UChip
          v-else-if="row.original.rowType === 'inhabitant' && row.original.inhabitant && getWaitlistEntryForCell(row.original.inhabitant.id, event.id)"
          v-bind="COMPONENTS.waitlist.chip"
          :data-testid="`grid-waitlist-${row.original.inhabitant.id}-${event.id}`"
        >
          <DinnerModeSelector
            :model-value="getWaitlistEntryForCell(row.original.inhabitant.id, event.id)!.order.dinnerMode"
            :form-mode="FORM_MODES.VIEW"
            :size="SIZES.standard"
            :name="`cell-${row.original.inhabitant.id}-${event.id}`"
            ghost
          />
          <template #content>
            <UIcon :name="ICONS.waitlist" :class="COMPONENTS.waitlist.chipIcon" />
          </template>
        </UChip>
        <!-- Inhabitant row -->
        <DinnerModeSelector
          v-else-if="row.original.rowType === 'inhabitant' && row.original.inhabitant"
          :model-value="getCellMode(row.original.inhabitant.id, event.id)"
          :form-mode="isEventDisabled(event) ? FORM_MODES.VIEW : effectiveFormMode"
          :interaction="effectiveFormMode === FORM_MODES.EDIT && !isEventDisabled(event) ? 'toggle' : 'buttons'"
          :disabled-modes="getCellDisabledModes(row.original.inhabitant.id, event.id)"
          :size="SIZES.standard"
          :name="`cell-${row.original.inhabitant.id}-${event.id}`"
          :is-modified="isCellModified(row.original.inhabitant.id, event.id)"
          :expected="isCellExpected(row.original.inhabitant.id, event.id)"
          @update:model-value="(mode: DinnerMode) => handleCellUpdate(row.original.inhabitant!.id, event.id, mode)"
        />
        <!-- Guest order row: a group holds the guest tickets of one dinner -->
        <DinnerModeSelector
          v-else-if="row.original.rowType === 'guest-order' && row.original.guestOrders?.some(o => o.dinnerEventId === event.id)"
          :model-value="getGuestCellMode(row.original.guestOrders)"
          :form-mode="isEventDisabled(event) ? FORM_MODES.VIEW : effectiveFormMode"
          :interaction="effectiveFormMode === FORM_MODES.EDIT && !isEventDisabled(event) ? 'toggle' : 'buttons'"
          :disabled-modes="getGuestDisabledModes(row.original.guestOrders)"
          :size="SIZES.standard"
          :name="`guest-${row.original.id}-${event.id}`"
          :is-modified="isGuestCellModified(row.original.guestOrders)"
          @update:model-value="(mode: DinnerMode) => handleGuestCellUpdate({guestOrders: row.original.guestOrders!, dinnerMode: mode})"
        />
        <!-- Guest add row: a chevron per future dinner, turned up while its form is open below -->
        <UButton
          v-else-if="row.original.rowType === 'guest-add' && !isEventDisabled(event) && canBookEvent(event)"
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
            <div :class="COMPONENTS.bookingGrid.actionStack">
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
      :show-expected="hasExpectedCell"
      hint="Klik på en celle for at ændre din booking, den cykler igennem mulighederne. Når du er færdig, husk at trykke gem."
      :class="COMPONENTS.bookingGrid.legend"
    />
  </div>
</template>
