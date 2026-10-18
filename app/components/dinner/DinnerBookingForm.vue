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
 * the name, the place in the line of the entry's ticket type (createWaitlistBadge through DeadlineBadge). One booking
 * path: the save sends the desired order through the scaffold, which books, buys a ticket for sale or queues by supply;
 * the save label previews the outcome (bookingSaveLabel over previewOutcome: Book, Køb billet, Skriv på venteliste,
 * Forlad ventelisten, Opdater); a requeue previews "X ændrer spisemåde til Sen (venteliste): 20/10/2026". A queued
 * row edits its wish (requeued) or picks Ingen to leave; Tilføj gæst saves the same way.
 */
import type {HouseholdDetail, InhabitantDisplay} from '~/composables/useCoreValidation'
import type {DinnerEventDisplay, OrderDisplay, DinnerMode, DesiredOrder, BookingRowAction, TicketState as TicketStateValue} from '~/composables/useBookingValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import type {AllergyTypeDisplay} from '~/composables/useAllergyValidation'
import type {SeasonDeadlines} from '~/composables/useSeason'
import type {TicketPresentation} from '~/composables/useBookingUi'
import {EMPTY_RELEASED_TICKET_COUNTS, supplyOfType, type PreviewSupply, type ReleasedTicketCounts} from '~/composables/useBooking'
import type {TicketWaitlistDetail} from '~/composables/useWaitlistValidation'
import {FORM_MODES} from '~/types/form'

// Row types for synthetic rows in table
type RowType = 'inhabitant' | 'power' | 'guest' | 'guest-order'

// Ticket config type

interface TableRow {
  rowType: RowType
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
  disabledModes: DinnerMode[] // Computed via getBookingOptions per row
  bookingAction: BookingRowAction | null // What action is possible for this row
  waitlistEntry?: TicketWaitlistDetail // The inhabitant's own place in the queue, while they hold no ticket
  consensus?: boolean // Power mode: true=all agree, false=mixed
  price: number
  ticketPriceId: number | null // Nullable: TicketPrice may be deleted (priceAtBooking preserved)
  guestCount?: number // undefined = not guest, 1+ = guest ticket(s)
  provenanceHousehold?: string
  ticketState: TicketStateValue // What the row's ticket is now: released, bought, queued for, or normal
  allergyTypes: AllergyTypeDisplay[] // The booked inhabitant's live allergy profile; empty for every other row
}

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
}

const props = withDefaults(defineProps<Props>(), {
  household: undefined,
  orders: () => [],
  ticketPrices: () => [],
  releasedTicketCounts: () => EMPTY_RELEASED_TICKET_COUNTS,
  canEditAdminOverride: undefined,
  waitlistEntries: () => [],
  loading: false
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

// Design system
const {COMPONENTS, SIZES, COLOR, ICONS, BUTTONS, ALERTS, getRandomEmptyMessage, getResidencyDisplay, LAYOUTS, NOISE, TYPOGRAPHY, TABLE_COLUMNS, ORIENTATIONS} = useTheSlopeDesignSystem()
const emptyStateMessage = getRandomEmptyMessage('household')

// Ticket business logic
const {resolveTicketPrice, formatPrice} = useTicket()

// Season business logic
const {isDinnerPast} = useSeason()
const {canModifyOrders, canEditDiningMode} = props.deadlines

// Validation
const {DinnerModeSchema, OrderStateSchema, BookingActionSchema} = useBookingValidation()
const DinnerModeEnum = DinnerModeSchema.enum
const OrderStateEnum = OrderStateSchema.enum

// Allergies store for guest allergy selection
const allergiesStore = useAllergiesStore()
const {allergyTypes} = storeToRefs(allergiesStore)

// ============================================================================
// EXPANDABLE ROW STATE
// ============================================================================

// Draft state for editing
const draftMode = ref<DinnerMode>(DinnerModeEnum.DINEIN)
const editingRowId = ref<number | string | null>(null)
const isSaving = ref(false)

// Single history visible at a time
const historyOrderId = ref<number | null>(null)
const toggleHistory = (orderId: number | null) => {
    historyOrderId.value = historyOrderId.value === orderId ? null : orderId
}

// Expandable row with callbacks
const {expanded} = useExpandableRow({
  onExpand: (rowIndex) => {
    const row = tableData.value[rowIndex]
    if (row) {
      editingRowId.value = row.id
      // A row without a ticket shows Ingen; the draft starts on the first mode the row may pick
      draftMode.value = row.disabledModes.includes(row.dinnerMode)
        ? ALL_MODES.find(mode => !row.disabledModes.includes(mode)) ?? row.dinnerMode
        : row.dinnerMode
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
const canChangeDiningMode = computed(() => canEditDiningMode(props.dinnerEvent.date))
const dinnerHasPassed = computed(() => isDinnerPast(props.dinnerEvent.date))
// Edit allowed if: permission-based formMode is EDIT AND dinner hasn't passed
const isEditModeAllowed = computed(() => formMode.value === FORM_MODES.EDIT && !dinnerHasPassed.value)

const isHouseholdInResidency = computed(() => {
  if (!household.value) return true
  return isHouseholdActiveOnDay(
    household.value.movedInDate, household.value.moveOutDate
  )(props.dinnerEvent.date)
})

const residencyAlert = computed(() => {
  if (isHouseholdInResidency.value || !household.value) return null
  return getResidencyDisplay(household.value.movedInDate, household.value.moveOutDate)
})

// All dinner modes for computing disabled from enabled
const ALL_MODES: DinnerMode[] = [DinnerModeEnum.DINEIN, DinnerModeEnum.DINEINLATE, DinnerModeEnum.TAKEAWAY, DinnerModeEnum.NONE]

// Compute booking state for a row using getBookingOptions
const getRowBookingState = (order: OrderDisplay | null, isGuestAddRow: boolean, isQueued = false): { disabledModes: DinnerMode[], bookingAction: BookingRowAction | null } => {
  const {enabledModes, action} = getBookingOptions(
    order,
    canBook.value,
    canChangeDiningMode.value,
    props.dinnerEvent.state,
    isHouseholdInResidency.value
  )
  // Disable NONE for: guest add row OR inhabitants without existing order (can't select "nothing" when no ticket exists)
  const hasNoExistingOrder = order === null
  const shouldDisableNone = isGuestAddRow || hasNoExistingOrder
  const withoutNone = enabledModes.filter(m => m !== DinnerModeEnum.NONE)
  // A queued inhabitant leaves the queue by picking Ingen
  const effectiveEnabled = isQueued ? [...withoutNone, DinnerModeEnum.NONE] : shouldDisableNone ? withoutNone : enabledModes
  return {
    disabledModes: ALL_MODES.filter(m => !effectiveEnabled.includes(m)),
    bookingAction: action
  }
}

// ============================================================================
// RELEASED TICKETS COMPUTEDS
// ============================================================================

// Household's own released tickets (for warning message)
const householdReleasedTickets = computed(() =>
  (props.orders ?? []).filter(o =>
    ticketStateOf(o) === TicketState.released &&
    o.dinnerEventId === props.dinnerEvent.id
  )
)

// ============================================================================
// ORDER PARTITIONING (uses useBooking helpers)
// ============================================================================

const eventOrders = computed(() =>
  (props.orders ?? []).filter(o => o.dinnerEventId === props.dinnerEvent.id)
)
const eventWaitlistEntries = computed(() => props.waitlistEntries.filter(entry => entry.dinnerEventId === props.dinnerEvent.id))

// The household's own notes on a closed dinner: the tickets it released and its places on the waiting list
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

// Inhabitant name lookup (used by actionPreviewItems)
const getInhabitantName = (id: number) =>
  household.value?.inhabitants.find(i => i.id === id)?.name ?? 'Ukendt'

const tableData = computed((): TableRow[] => {
  if (!household.value?.inhabitants) return []

  const allInhabitants = household.value.inhabitants

  const inhabitantRows: TableRow[] = allInhabitants.map(inhabitant => {
    const order = findRegularOrder(eventOrders.value, inhabitant.id, props.dinnerEvent.id) ?? null
    // An order supersedes a queue entry: the assignment deletes the entry it placed
    const waitlistEntry = order ? undefined : findRegularOrder(eventWaitlistEntries.value, inhabitant.id, props.dinnerEvent.id)

    // Single DRY code path: resolveTicketPrice → ticketTypePresentation
    const ticketPrice = resolveTicketPrice(
      inhabitant.birthDate ?? null,
      order?.priceAtBooking,
      props.ticketPrices
    )

    return {
      rowType: 'inhabitant' as RowType,
      id: inhabitant.id,
      name: inhabitant.name,
      lastName: inhabitant.lastName,
      birthDate: inhabitant.birthDate,
      inhabitant,
      ticketConfig: ticketPrice ? ticketTypePresentation(ticketPrice.ticketType) : null,
      order,
      waitlistEntry,
      dinnerMode: order?.dinnerMode ?? waitlistEntry?.order.dinnerMode ?? DinnerModeEnum.NONE,
      ...getRowBookingState(order, false, !!waitlistEntry),
      price: order?.priceAtBooking ?? ticketPrice?.price ?? 0,
      ticketPriceId: order?.ticketPriceId ?? ticketPrice?.id ?? null,
      provenanceHousehold: order?.provenanceHousehold,
      ticketState: ticketStateOf(order, !!waitlistEntry),
      allergyTypes: order ? (inhabitant.allergies ?? []).map(allergy => allergy.allergyType) : []
    }
  })

  // A guest row is a placed group (booker, ticketType, eventId) or one queued guest: the same row, booked or queued
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
      ? props.ticketPrices.find(price => price.id === waitlistEntry.order.ticketPriceId)
      : resolveTicketPrice(null, held.priceAtBooking, props.ticketPrices)

    return {
      rowType: 'guest-order' as RowType,
      id,
      name: 'Gæst',
      lastName: '',
      inhabitant: booker,
      ticketConfig: resolvedTicketPrice ? ticketTypePresentation(resolvedTicketPrice.ticketType) : null,
      order: firstOrder,
      orders,
      waitlistEntry,
      dinnerMode: held.dinnerMode,
      ...getRowBookingState(firstOrder, false, !!waitlistEntry),
      price: held.priceAtBooking ?? 0,
      ticketPriceId: held.ticketPriceId ?? resolvedTicketPrice?.id ?? null,
      guestCount: Math.max(orders.length, 1),
      provenanceHousehold: firstOrder?.provenanceHousehold,
      ticketState: ticketStateOf(firstOrder, !!waitlistEntry),
      allergyTypes: []
    }
  })

  const {value: consensusMode, consensus: hasConsensus} = getPowerConsensus(allInhabitants.map(i => i.id), eventOrders.value, props.dinnerEvent.id)

  // Default synthetic row template
  const defaultSyntheticRow = {
    lastName: '',
    ticketConfig: null,
    order: null,
    price: 0,
    ticketPriceId: 0,
    disabledModes: [] as DinnerMode[],
    bookingAction: null as BookingRowAction | null,
    ticketState: TicketState.normal,
    allergyTypes: [] as AllergyTypeDisplay[]
  }

  // Power row with consensus (shown in both VIEW and EDIT modes)
  // Power row uses first inhabitant's booking state (they all share same deadline constraints)
  const powerRow: TableRow = {
    ...defaultSyntheticRow,
    rowType: 'power' as RowType,
    id: 'power-mode',
    name: 'Hele familien',
    inhabitants: allInhabitants,
    ticketConfig: COMPONENTS.powerMode.ticketConfig,
    dinnerMode: consensusMode,
    disabledModes: inhabitantRows[0]?.disabledModes ?? [],
    bookingAction: inhabitantRows[0]?.bookingAction ?? null,
    consensus: hasConsensus
  }

  // VIEW mode: power + inhabitants + guest orders
  if (!isEditModeAllowed.value) return [powerRow, ...inhabitantRows, ...guestOrderRows]

  // EDIT mode: power + inhabitants + guest orders + add guest
  // Guest add row: isGuestAddRow=true to disable NONE
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
    {...defaultSyntheticRow, rowType: 'guest' as RowType, id: 'add-guest', name: 'Tilføj gæst', inhabitant: guestAddInhabitant, dinnerMode: DinnerModeEnum.DINEIN, ...getRowBookingState(null, true)}
  ]
})

// ============================================================================
// HANDLERS
// ============================================================================

// Build desired orders for a row (DRY: used by handleSave and actionPreviewItems)
const buildDesiredOrdersForRow = (row: TableRow): DesiredOrder[] => {
  const dinnerEventId = props.dinnerEvent.id
  const buildForInhabitants = (inhabitantIds: number[]) => buildDesiredOrders(
    inhabitantIds.map(inhabitantId => ({inhabitantId, dinnerEventId, dinnerMode: draftMode.value})),
    eventOrders.value,
    household.value?.inhabitants ?? [],
    [props.dinnerEvent],
    props.ticketPrices
  )

  if (row.rowType === 'power') {
    const inhabitantIds = (household.value?.inhabitants ?? []).map(i => i.id)
    return buildBookingChanges(
      getPowerChanges(inhabitantIds, eventOrders.value, dinnerEventId, draftMode.value),
      eventOrders.value,
      household.value?.inhabitants ?? [],
      [props.dinnerEvent],
      props.ticketPrices
    )
  }

  if (row.rowType === 'guest-order' && row.waitlistEntry) {
    // A queued guest names its entry: Ingen leaves the queue, another mode requeues the wish at the held price
    const {id: waitlistEntryId, inhabitantId, order} = row.waitlistEntry
    return [{
      inhabitantId, dinnerEventId, dinnerMode: draftMode.value, ticketPriceId: order.ticketPriceId,
      isGuestTicket: true, allergyTypeIds: order.allergyTypeIds, state: OrderStateEnum.BOOKED, waitlistEntryId
    }]
  }

  if (row.rowType === 'guest-order') {
    const guestOrders = row.orders ?? (row.order ? [row.order] : [])
    return buildGuestDesiredOrders([{guestOrders, dinnerMode: draftMode.value}], props.ticketPrices)
  }

  if (row.rowType === 'inhabitant' && typeof row.id === 'number') {
    // A queued row names its entry: Ingen leaves the queue, another mode requeues the wish
    const waitlistEntryId = row.waitlistEntry?.id
    return buildForInhabitants([row.id]).map(order => waitlistEntryId ? {...order, waitlistEntryId} : order)
  }

  return []
}

const handleSave = async (row: TableRow) => {
  isSaving.value = true

  try {
    // Validate before building orders
    if (row.rowType === 'power') {
      const inhabitantRows = tableData.value.filter((r: TableRow) => r.rowType === 'inhabitant')
      const missingPrice = inhabitantRows.find(r => r.ticketPriceId === null)
      if (missingPrice) {
        throw new Error(`Kan ikke booke: mangler billetpris for ${missingPrice.name}`)
      }
    } else if (!row.ticketPriceId) {
      throw new Error(row.rowType === 'guest-order'
        ? 'Kan ikke booke: mangler billetpris for gæst'
        : `Kan ikke booke: mangler billetpris for ${row.name}`)
    }

    const orders = buildDesiredOrdersForRow(row)

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

const {groupGuestOrders, getBookingOptions, getDayBillSummary, resolveUserBookingBuckets, buildDesiredOrders, buildGuestDesiredOrders, buildBookingChanges, getPowerChanges, getPowerConsensus} = useBooking()
const {createBookingBadges, createWaitlistBadge, bookingSaveLabel, previewOutcome, formatActionPreview} = useBookingUi()

// A queue entry's place names the line of the ticket type its price holds
const ticketTypeOfEntry = computed(() => useWaitlist().ticketTypeOfEntry(props.ticketPrices))

// Deadline badges
const badges = computed(() => createBookingBadges(props.dinnerEvent, props.deadlines, props.releasedTicketCounts))

// Day bill summary (ticket counts + total price)
const dayBillSummary = computed(() => getDayBillSummary(eventOrders.value))

// The client settles a claim against the tickets for sale of the order's ticket type on this dinner (the lock status)
const supply: PreviewSupply = order => supplyOfType(props.releasedTicketCounts, props.ticketPrices, order.ticketPriceId)

// What saving the expanded row does: its buckets feed the preview lines and the save label
const editingBuckets = computed(() => {
  const row = tableData.value.find(r => r.id === editingRowId.value)
  if (!row || row.rowType === 'guest') return null // guest-add uses GuestBookingForm

  const desiredOrders = buildDesiredOrdersForRow(row)
  if (desiredOrders.length === 0) return null

  // The household's queue entries tell a requeue or a leave from a new claim
  return resolveUserBookingBuckets(
    desiredOrders,
    eventOrders.value,
    [props.dinnerEvent],
    props.deadlines,
    eventWaitlistEntries.value
  )
})

const actionPreviewItems = computed(() =>
  editingBuckets.value ? formatActionPreview(editingBuckets.value, eventOrders.value, [props.dinnerEvent], getInhabitantName, supply) : [])
const saveLabel = computed(() => bookingSaveLabel(editingBuckets.value ? previewOutcome(editingBuckets.value, supply) : BookingActionSchema.enum.CHANGE_MODE))
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
  <div v-else :class="COMPONENTS.bookingForm.root">
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
      :loading="loading"
      row-key="id"
      data-testid="booking-table"
      :ui="COMPONENTS.table.bookingUi"
    >
      <!-- Expand button column - uses BUTTONS.edit for standardized sizing -->
      <template #expand-cell="{row}">
        <UButton
          v-if="isEditModeAllowed"
          v-bind="BUTTONS.edit"
          :icon="row.getIsExpanded() ? ICONS.chevronDown : (row.original.rowType === 'power' ? COMPONENTS.powerMode.buttonIcon : (row.original.rowType === 'guest' ? ICONS.plusCircle : BUTTONS.edit.icon))"
          :aria-label="row.getIsExpanded() ? 'Luk' : 'Rediger'"
          :data-testid="`${row.original.rowType}-${row.original.id}-toggle`"
          :class="[COMPONENTS.openTurn(row.getIsExpanded()), row.original.rowType === 'power' && !row.getIsExpanded() && COMPONENTS.bookingForm.powerToggleIdle]"
          @click="row.toggleExpanded()"
        />
      </template>

      <!-- Name Column -->
      <template #name-cell="{row}">
        <div :class="COMPONENTS.bookingForm.nameCell">
          <!-- Power Mode Row - UserListItem in GROUP mode with ticket below -->
          <div v-if="row.original.rowType === 'power' && row.original.inhabitants" :class="COMPONENTS.bookingForm.powerName">
            <UserListItem
              :inhabitants="row.original.inhabitants"
              :show-names="false"
              :link-to-profile="false"
              compact
              label="beboere"
            />
            <!-- DinnerTicket for power row (mobile only - desktop in ticket-cell) -->
            <div :class="COMPONENTS.bookingForm.ticketPhone">
              <DinnerTicket
                :ticket-config="row.original.ticketConfig"
                :price="row.original.price"
                :dinner-mode="row.original.dinnerMode"
                :consensus="row.original.consensus"
              />
            </div>
          </div>

          <!-- Guest Add Row - UserListItem with synthetic inhabitant -->
          <div v-else-if="row.original.rowType === 'guest' && row.original.inhabitant">
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
          <div v-else-if="row.original.rowType === 'inhabitant' && row.original.inhabitant">
            <UserListItem
              :inhabitants="row.original.inhabitant"
              :link-to-profile="false"
              compact
            >
              <template #badge>
                <!-- Released badge -->
                <UBadge
                  v-if="row.original.ticketState === TicketState.released"
                  :color="COLOR.error"
                  :variant="NOISE.soft"
                  :size="SIZES.small"
                  :icon="ICONS.released"
                >
                  FRIGIVET
                </UBadge>
                <!-- Provenance badges -->
                <div v-else-if="row.original.provenanceHousehold" :class="COMPONENTS.bookingForm.provenance">
                  <UBadge :color="COLOR.info" :variant="NOISE.soft" :size="SIZES.sm" :icon="ICONS.claim">
                    fra {{ row.original.provenanceHousehold }}
                  </UBadge>
                </div>
              </template>
            </UserListItem>
          </div>

          <!-- Guest Order Row - show who invited using UserListItem -->
          <div v-else-if="row.original.rowType === 'guest-order'">
            <div :class="COMPONENTS.bookingForm.guestOf">
              <UAvatar :icon="ICONS.userPlus" :size="COMPONENTS.avatar.compact.size" :class="COMPONENTS.avatar.compact.fit" />
              <span :class="COMPONENTS.bookingForm.guestOfLabel">Gæst af</span>
              <UserListItem
                v-if="row.original.inhabitant"
                :inhabitants="row.original.inhabitant"
                :link-to-profile="false"
                compact
                :show-names="true"
              />
              <span v-else :class="TYPOGRAPHY.bodyTextSmall">ukendt</span>
            </div>
            <!-- Provenance badges -->
            <div v-if="row.original.provenanceHousehold" :class="COMPONENTS.bookingForm.guestProvenance">
              <UBadge :color="COLOR.info" :variant="NOISE.soft" :size="SIZES.sm" :icon="ICONS.claim">
                fra {{ row.original.provenanceHousehold }}
              </UBadge>
            </div>
          </div>

          <!-- Queue position of an inhabitant or a guest: the deadline badges' path, on the line under the name -->
          <div v-if="row.original.waitlistEntry" :class="COMPONENTS.bookingForm.guestProvenance" :data-testid="`waitlist-position-${row.original.id}`">
            <DeadlineBadge :badge="createWaitlistBadge(row.original.waitlistEntry.position, ticketTypeOfEntry(row.original.waitlistEntry))" compact />
          </div>

          <!-- Mobile: Ticket inline (for inhabitant/guest-order rows only) -->
          <div v-if="row.original.rowType === 'inhabitant' || row.original.rowType === 'guest-order'" :class="COMPONENTS.bookingForm.ticketPhone">
            <DinnerTicket
              :ticket-config="row.original.ticketConfig"
              :price="row.original.price"
              :dinner-mode="row.original.dinnerMode"
              :ticket-state="row.original.ticketState"
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
        <div v-if="row.original.rowType === 'power'" :class="COMPONENTS.bookingForm.ticketDesktop">
          <DinnerTicket
            :ticket-config="row.original.ticketConfig"
            :price="row.original.price"
            :dinner-mode="row.original.dinnerMode"
            :consensus="row.original.consensus"
          />
        </div>
        <!-- Inhabitant/Guest rows: show ticket -->
        <div v-else-if="row.original.rowType === 'inhabitant' || row.original.rowType === 'guest-order'" :class="COMPONENTS.bookingForm.ticketDesktop">
          <DinnerTicket
            :ticket-config="row.original.ticketConfig"
            :price="row.original.price"
            :dinner-mode="row.original.dinnerMode"
            :ticket-state="row.original.ticketState"
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
          v-if="row.original.rowType === 'guest' && bookerInhabitant?.id"
          :dinner-event="dinnerEvent"
          :ticket-prices="ticketPrices"
          :allergy-types="allergyTypes ?? []"
          :deadlines="deadlines"
          :released-ticket-counts="releasedTicketCounts"
          :booker-id="bookerInhabitant.id"
          :booker-name="bookerInhabitant.name"
          :is-household-in-residency="isHouseholdInResidency"
          @save="handleGuestSave"
          @cancel="handleCancel"
        />

        <!-- Other row types: UCard with form -->
        <UCard
          v-else
          :color="row.original.rowType === 'power' ? COMPONENTS.powerMode.card.color : COLOR.primary"
          :variant="COMPONENTS.powerMode.card.variant"
          v-bind="COMPONENTS.bookingForm.editCard"
        >
          <template #header>
            <h4 :class="COMPONENTS.bookingForm.editTitle">
              <template v-if="row.original.rowType === 'power'">
                Vælg for hele familien
              </template>
              <template v-else-if="row.original.rowType === 'guest-order'">
                Opdater gæstebillet
              </template>
              <template v-else>
                Vælg spisning for {{ row.original.name }}
              </template>
            </h4>
          </template>

          <!-- Power mode warning -->
          <UAlert
            v-if="row.original.rowType === 'power'"
            v-bind="ALERTS.warning"
            :icon="COMPONENTS.powerMode.icon"
            title="Du er ved at aktivere power mode"
            :description="`Ændringer påvirker alle ${household?.inhabitants?.length ?? 0} medlemmer.`"
          />

          <!-- The booked inhabitant's allergies, from the household's live profile -->
          <div
            v-if="row.original.rowType === 'inhabitant' && row.original.allergyTypes.length"
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

          <!-- Mode selector: a queued inhabitant changes the wish (requeued) or picks Ingen to leave the queue -->
          <DinnerModeSelector
            v-model="draftMode"
            :form-mode="FORM_MODES.EDIT"
            :disabled-modes="row.original.disabledModes"
            :consensus="row.original.consensus"
            :size="SIZES.standard"
            :name="`${row.original.rowType}-${row.original.id}-mode-edit`"
            :orientation="ORIENTATIONS.horizontal"
            show-label
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
              <ActionPreview :items="actionPreviewItems" />

              <div :class="LAYOUTS.formButtonRow">
                <UButton
                  v-bind="BUTTONS.cancel"
                  :data-testid="`${row.original.rowType}-${row.original.id}-cancel`"
                  @click="handleCancel"
                >
                  Annuller
                </UButton>
                <UButton
                  v-bind="row.original.rowType === 'power' ? {} : BUTTONS.save"
                  :color="row.original.rowType === 'power' ? COMPONENTS.powerMode.color : undefined"
                  :loading="isSaving"
                  :disabled="row.original.bookingAction === null"
                  :data-testid="`${row.original.rowType}-${row.original.id}-save`"
                  @click="handleSave(row.original)"
                >
                  <template #leading>
                    <UIcon :name="row.original.rowType === 'power' ? COMPONENTS.powerMode.buttonIcon : ICONS.check" />
                  </template>
                  {{ row.original.rowType === 'power' ? 'Gem for alle' : saveLabel }}
                </UButton>
              </div>
            </div>
          </template>
        </UCard>
      </template>
    </UTable>

    <!-- Legend: shared with the week/month grid -->
    <DinnerModeLegend v-if="isEditModeAllowed" :class="COMPONENTS.bookingForm.legend"/>
  </div>
</template>
