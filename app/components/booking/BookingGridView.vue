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
 * │ Lars V 🎟️3 🔓1  │  🍽️  │  🕐  ║  🍽️  │  ❌  │  🍽️  ║  ❌  │ <- with released badge
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
 * │ Lars V 🎟️3 🔓1  │  🍽️  │  🕐  ║  🍽️  │  ❌° │  🍽️  ║  ❌  │
 * ├──────────────────┼──────┼──────╫──────┼──────┼──────╫──────┤
 * │ 🎫 Gæst af Anna  │  🍽️  │      ║      │      │  🍽️  ║      │ <- existing guest
 * │ ➕ Tilføj gæst   │      │      ║      │  +   │  +   ║  +   │ <- add guest (future only)
 * ├──────────────────┴──────┴──────╨──────┴──────┴──────╨──────┤
 * │ 3 ændringer                         [Annuller] [Gem]       │
 * └────────────────────────────────────────────────────────────┘
 *
 * ROW TYPES:
 * | Row Type    | Icon | VIEW           | EDIT                | Description        |
 * |-------------|------|----------------|---------------------|--------------------|
 * | power       | ⚡   | Consensus/?    | Editable (future)   | Bulk update all    |
 * | inhabitant  | 👤   | Booking state  | Editable (future)   | Household member   |
 * | guest-order | 🎫   | Booking state  | Locked past, edit   | Existing guest     |
 * | guest-add   | ➕   | Hidden         | + buttons (future)  | Add new guest      |
 *
 * CELL STATES: 🍽️=dine-in, 🕐=late, 🛍️=takeaway, ❌=none, ?=no consensus, °=modified
 * HEADER CHIPS: (🟠)=locked, (🟡N)=locked with N tickets available
 */
import type {HouseholdDetail, InhabitantDisplay} from '~/composables/useCoreValidation'
import type {DinnerEventDisplay, OrderDisplay, DinnerMode, DesiredOrder} from '~/composables/useBookingValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import type {AllergyTypeDisplay} from '~/composables/useAllergyValidation'
import type {SeasonDeadlines} from '~/composables/useSeason'
import type {BookingView} from '~/composables/useBookingView'
import type {DateRange} from '~/types/dateTypes'
import type {NuxtUIColor} from '~/composables/useTheSlopeDesignSystem'
import type {ReleasedTicketCounts} from '~/composables/useBooking'
import {FORM_MODES, type FormMode} from '~/types/form'

// Row types for synthetic rows (same pattern as HouseholdCard)
type RowType = 'power' | 'inhabitant' | 'guest-order' | 'guest-add'

// Ticket config type (same as DinnerBookingForm)
type TicketConfig = {label: string; color: NuxtUIColor; icon: string} | null

// Lock status config type (from design system BOOKING_LOCK_STATUS)
type LockStatusConfig = {color: NuxtUIColor; icon: string}

interface GridRow {
  rowType: RowType
  id: number | string
  name: string
  inhabitant?: InhabitantDisplay // For inhabitant row, or booker for guest-order
  inhabitants?: InhabitantDisplay[] // For power mode
  guestOrders?: OrderDisplay[] // For grouped guest bookings (by booker+ticketType+event)
  ticketConfig?: TicketConfig // For guest rows - ticket type config with color
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
  allergyTypes?: AllergyTypeDisplay[]
  bookerId?: number // Current user's inhabitant ID for guest booking
  formMode?: FormMode
  canEdit?: boolean // Access control: hide edit controls when false
  isSaving?: boolean
  hasPrev?: boolean
  hasNext?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  lockStatus: () => new Map(),
  allergyTypes: () => [],
  bookerId: undefined,
  formMode: FORM_MODES.VIEW,
  canEdit: true,
  isSaving: false,
  hasPrev: true,
  hasNext: true
})

// Calendar open state (for toggle in header)
const calendarOpen = defineModel<boolean>('calendarOpen', { default: true })

const emit = defineEmits<{
  save: [changes: { inhabitantId: number, dinnerEventId: number, dinnerMode: DinnerMode }[]]
  cancel: []
  'update:formMode': [mode: FormMode]
  navigate: [direction: 'prev' | 'next']
  addGuest: [orders: DesiredOrder[]]
}>()

// Design system
const {ICONS, COLOR, SIZES, COMPONENTS, TYPOGRAPHY, BUTTONS, getRandomEmptyMessage, getOrderStateColor, getLockStatusConfig, getResidencyDisplay} = useTheSlopeDesignSystem()
const emptyState = getRandomEmptyMessage('noDinners')

// Ticket price formatting
const {formatPrice, getTicketTypeConfig, resolveTicketPrice, ticketTypeConfig} = useTicket()

// Booking helpers (shared with DinnerBookingForm)
const {groupGuestOrders, partitionGuestOrders, getDayBillSummary, resolveUserBookingBuckets, getBookingOptions} = useBooking()
const {formatActionPreview} = useBookingUi()

// Inhabitant name lookup (used by actionPreviewItems)
const getInhabitantName = (id: number) =>
  props.household.inhabitants.find(i => i.id === id)?.name ?? 'Ukendt'

// Validation schemas
const {DinnerModeSchema, OrderStateSchema} = useBookingValidation()
const DinnerModeEnum = DinnerModeSchema.enum
const OrderStateEnum = OrderStateSchema.enum

// ============================================================================
// DRAFT STATE (ADR-016)
// ============================================================================

const draftChanges = ref<Map<string, DinnerMode>>(new Map())
const hasPendingChanges = computed(() => draftChanges.value.size > 0)

// Action preview: show what will happen when saving (uses same resolver as server)
const actionPreviewItems = computed(() => {
  if (!hasPendingChanges.value) return []

  // Build desired orders from draft changes
  const desiredOrders: DesiredOrder[] = Array.from(draftChanges.value.entries()).map(([key, dinnerMode]) => {
    const [inhabitantId, dinnerEventId] = key.split('-').map(Number)
    const existingOrder = props.orders.find(o => o.inhabitantId === inhabitantId && o.dinnerEventId === dinnerEventId && !o.isGuestTicket)
    const inhabitant = props.household.inhabitants.find(i => i.id === inhabitantId)
    const ticketPriceId = existingOrder?.ticketPriceId ?? resolveTicketPrice(
      inhabitant?.birthDate ?? null,
      null,
      props.ticketPrices
    )?.id

    return {
      inhabitantId: inhabitantId!,
      dinnerEventId: dinnerEventId!,
      dinnerMode,
      ticketPriceId: ticketPriceId!,
      isGuestTicket: false,
      orderId: existingOrder?.id,
      state: OrderStateEnum.BOOKED
    }
  }).filter(o => o.ticketPriceId) as DesiredOrder[]

  if (desiredOrders.length === 0) return []

  const buckets = resolveUserBookingBuckets(
    desiredOrders,
    props.orders,
    props.dinnerEvents,
    props.deadlines
  )

  return formatActionPreview(buckets, props.orders, getInhabitantName)
})

// Effective form mode - VIEW when saving to prevent cell edits
const effectiveFormMode = computed(() => props.isSaving ? FORM_MODES.VIEW : props.formMode)

const getServerMode = (inhabitantId: number, eventId: number): DinnerMode =>
  props.orders.find(o => o.inhabitantId === inhabitantId && o.dinnerEventId === eventId)?.dinnerMode ?? DinnerModeEnum.NONE

const getCellMode = (inhabitantId: number, eventId: number): DinnerMode => {
  const key = `${inhabitantId}-${eventId}`
  return draftChanges.value.get(key) ?? getServerMode(inhabitantId, eventId)
}

const isCellModified = (inhabitantId: number, eventId: number): boolean =>
  draftChanges.value.has(`${inhabitantId}-${eventId}`)

const handleCellUpdate = (inhabitantId: number, eventId: number, newMode: DinnerMode) => {
  const key = `${inhabitantId}-${eventId}`
  const serverMode = getServerMode(inhabitantId, eventId)
  if (newMode === serverMode) {
    draftChanges.value.delete(key)
  } else {
    draftChanges.value.set(key, newMode)
  }
}

const handlePowerUpdate = (eventId: number, newMode: DinnerMode) => {
  props.household.inhabitants.forEach(inhabitant => {
    handleCellUpdate(inhabitant.id, eventId, newMode)
  })
}

const handleCancel = () => {
  draftChanges.value.clear()
  emit('update:formMode', FORM_MODES.VIEW)
  emit('cancel')
}

const handleSave = () => {
  const changes = Array.from(draftChanges.value.entries()).map(([key, dinnerMode]) => {
    const [inhabitantId, dinnerEventId] = key.split('-').map(Number)
    return { inhabitantId: inhabitantId!, dinnerEventId: dinnerEventId!, dinnerMode }
  })
  emit('save', changes)
  draftChanges.value.clear()
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

// Handle mode change from FormModeSelector (reserved for future use)
const _handleModeChange = (mode: FormMode) => {
  if (mode === FORM_MODES.VIEW && hasPendingChanges.value) {
    // If switching back to VIEW with pending changes, clear them
    draftChanges.value.clear()
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
// COMPUTED: Dynamic columns (fixed + dinner events)
// ============================================================================

const columns = computed(() => {
  const fixedColumns = [
    {id: 'name', header: 'Beboer', footer: () => 'Sum', size: 120}
  ]

  // Dynamic columns for each dinner event (footer via slot template)
  const eventColumns = flatEvents.value.map((event, idx) => {
    const isWeekBoundary = isFirstEventOfWeek(event, idx)
    const boundaryClass = isWeekBoundary ? 'border-l-2 border-primary' : ''
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
      isSynthetic: false
    })
  })

  // Guest order rows - grouped by (booker, ticketType, eventId) - same pattern as DinnerBookingForm
  const guestGroups = groupGuestOrders(guestOrders.value)
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
      ticketConfig: resolvedTicketPrice ? ticketTypeConfig[resolvedTicketPrice.ticketType] : null,
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

const getOrderForCell = (inhabitantId: number, eventId: number): OrderDisplay | undefined =>
  props.orders.find(o => o.inhabitantId === inhabitantId && o.dinnerEventId === eventId)

const _getDinnerModeForCell = (inhabitantId: number, eventId: number): DinnerMode =>
  getOrderForCell(inhabitantId, eventId)?.dinnerMode ?? DinnerModeEnum.NONE

// Order counts for inhabitant in visible range
const getOrderCountsForInhabitant = (inhabitantId: number): { total: number, released: number } => {
  const visibleEventIds = new Set(flatEvents.value.map(e => e.id))
  const orders = props.orders.filter(o =>
    o.inhabitantId === inhabitantId &&
    (o.state === OrderStateEnum.BOOKED || o.state === OrderStateEnum.RELEASED) &&
    visibleEventIds.has(o.dinnerEventId)
  )
  return {
    total: orders.length,
    released: orders.filter(o => o.state === OrderStateEnum.RELEASED).length
  }
}

// Check if order is released (for cell visual indicator - reserved for future use)
const _isOrderReleased = (inhabitantId: number, eventId: number): boolean =>
  getOrderForCell(inhabitantId, eventId)?.state === OrderStateEnum.RELEASED

// Consensus for power row - check if all inhabitants have same mode for an event
const getEventConsensus = (eventId: number): { mode: DinnerMode, hasConsensus: boolean } => {
  const inhabitants = props.household.inhabitants
  if (inhabitants.length === 0) return { mode: DinnerModeEnum.DINEIN, hasConsensus: true }

  const modes = inhabitants.map(i => getCellMode(i.id, eventId))
  const firstMode = modes[0]!
  const hasConsensus = modes.every(m => m === firstMode)

  return {
    mode: hasConsensus ? firstMode : DinnerModeEnum.DINEIN,
    hasConsensus
  }
}

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

const getCellDisabledModes = (inhabitantId: number, event: DinnerEventDisplay): DinnerMode[] => {
  if (isDinnerPast(event.date)) return ALL_MODES

  const order = getOrderForCell(inhabitantId, event.id)
  const releasedCount = props.lockStatus?.get(event.id)?.total ?? 0

  const {enabledModes} = getBookingOptions(
    order?.state ?? null,
    canBookEvent(event),
    canChangeEventMode(event),
    event.state,
    releasedCount > 0,
    isHouseholdInResidency(event.date)
  )
  return ALL_MODES.filter(m => !enabledModes.includes(m))
}

// Residency alert: shown when any visible event falls outside residency
const residencyAlert = computed(() => {
  const hasDisabledByResidency = flatEvents.value.some(e => !isHouseholdInResidency(e.date))
  if (!hasDisabledByResidency) return null
  return getResidencyDisplay(props.household.movedInDate, props.household.moveOutDate)
})

const getPowerDisabledModes = (event: DinnerEventDisplay): DinnerMode[] => {
  const firstInhabitant = props.household.inhabitants[0]
  if (!firstInhabitant) return ALL_MODES
  return getCellDisabledModes(firstInhabitant.id, event)
}

// Lock status for column header chips (reuse calendar pattern)
const getEventLockStatus = (event: DinnerEventDisplay): { config: LockStatusConfig, count: number } | null => {
  if (canBookEvent(event)) return null // Not locked
  if (isDinnerPast(event.date)) return null
  // Count released orders for this event
  const releasedCount = props.orders.filter(o =>
    o.dinnerEventId === event.id && o.state === OrderStateEnum.RELEASED
  ).length
  const config = getLockStatusConfig(releasedCount)
  return config ? { config, count: releasedCount } : null
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

// Use partitionGuestOrders (same as DinnerBookingForm) - filters by isGuestTicket
const guestOrders = computed(() => partitionGuestOrders(props.orders).guestOrders)

// ============================================================================
// EVENT SUMMARIES (for footer - matches economy view format)
// ============================================================================

const getEventSummary = (eventId: number) => {
  const eventOrders = props.orders.filter(o => o.dinnerEventId === eventId)
  return getDayBillSummary(eventOrders)
}
</script>

<template>
  <div data-testid="booking-grid-view" class="flex flex-col">
    <!-- Navigation Header (3-column: spacer | centered nav | edit button) -->
    <div class="flex items-center px-2 py-2 border-b border-default">
      <div class="flex-1" />
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
      <div class="flex-1 flex justify-end">
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
      :color="residencyAlert.color"
      variant="soft"
      :icon="residencyAlert.icon"
      :title="residencyAlert.alertTitle"
      :description="residencyAlert.alertDescription"
      data-testid="outside-residency-alert"
      class="mx-2 mt-2"
    />

    <!-- Day view: slot for DinnerBookingForm -->
    <div v-if="view === 'day'" class="pt-2 md:pt-4">
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
      row-key="id"
      :ui="{
        tbody: '[&_tr:first-child]:bg-warning/10',
        tr: 'data-[expanded=true]:bg-elevated/50',
        th: 'px-1 py-1 md:px-2 md:py-2 text-center',
        td: 'px-1 py-1 md:px-2 text-center',
        tfoot: 'sticky bottom-0 bg-default px-1 py-1 md:px-2 text-center text-xs'
      }"
    >
      <!-- Empty state -->
      <template #empty-state>
        <UAlert
          variant="soft"
          :color="COLOR.neutral"
          :avatar="{ text: emptyState.emoji, size: SIZES.emptyStateAvatar }"
          :ui="COMPONENTS.emptyStateAlert"
        >
          <template #title>{{ emptyState.text }}</template>
          <template #description>
            {{ view === 'week' ? 'Ingen middage denne uge' : 'Ingen middage denne måned' }}
          </template>
        </UAlert>
      </template>

      <!-- Dynamic event column headers: M / 29/1 / chip (fixed height) -->
      <template v-for="event in flatEvents" :key="`header-${event.id}`" #[`event-${event.id}-header`]>
        <div
          class="flex flex-col items-center"
          :class="{ 'text-muted': isEventDisabled(event) }"
        >
          <span :class="TYPOGRAPHY.caption">{{ formatDate(event.date, 'EEEEE') }}</span>
          <span :class="TYPOGRAPHY.finePrint">{{ formatDate(event.date, 'd/M') }}</span>
          <!-- Fixed height slot for chip: 🟠=locked, 🟡N=locked with N tickets -->
          <div class="h-6 flex items-center justify-center">
            <UChip
              v-if="getEventLockStatus(event)"
              :color="getEventLockStatus(event)!.config.color"
              :text="getEventLockStatus(event)!.count > 0 ? String(getEventLockStatus(event)!.count) : undefined"
              size="3xl"
              position="bottom-left"
              standalone
            />
          </div>
        </div>
      </template>

      <!-- Name column -->
      <template #name-cell="{row}">
        <!-- Power row -->
        <div v-if="row.original.rowType === 'power'" class="flex items-center gap-2">
          <UIcon :name="COMPONENTS.powerMode.buttonIcon" :class="COMPONENTS.powerMode.iconClass" />
          <UBadge :color="COMPONENTS.powerMode.color" variant="subtle" :size="SIZES.sm">
            POWERMODE!
          </UBadge>
        </div>
        <!-- Inhabitant row: user + ticket count badge + released badge -->
        <div v-else-if="row.original.rowType === 'inhabitant' && row.original.inhabitant" class="flex items-center gap-1">
          <UserListItem
            :inhabitants="row.original.inhabitant"
            :link-to-profile="false"
            compact
          >
            <template #badge>
              <UBadge
                v-if="getTicketTypeConfig(row.original.inhabitant.birthDate ?? null, ticketPrices)"
                :color="getTicketTypeConfig(row.original.inhabitant.birthDate ?? null, ticketPrices)!.color"
                variant="subtle"
                :size="SIZES.xs"
              >
                {{ getTicketTypeConfig(row.original.inhabitant.birthDate ?? null, ticketPrices)!.label }}
              </UBadge>
            </template>
          </UserListItem>
          <!-- Ticket count badge (only if > 0) -->
          <UBadge
            v-if="getOrderCountsForInhabitant(row.original.inhabitant.id).total > 0"
            :color="COLOR.neutral"
            variant="soft"
            :size="SIZES.xs"
          >
            <UIcon :name="ICONS.ticket" class="size-3" />
            {{ getOrderCountsForInhabitant(row.original.inhabitant.id).total }}
          </UBadge>
          <!-- Released badge (only if > 0) -->
          <UBadge
            v-if="getOrderCountsForInhabitant(row.original.inhabitant.id).released > 0"
            :color="getOrderStateColor(true, false)"
            variant="soft"
            :size="SIZES.xs"
          >
            <UIcon :name="ICONS.released" class="size-3" />
            {{ getOrderCountsForInhabitant(row.original.inhabitant.id).released }}
          </UBadge>
        </div>
        <!-- Guest order row - show who invited using UserListItem (same as DinnerBookingForm) -->
        <div v-else-if="row.original.rowType === 'guest-order'" class="flex items-center gap-2">
          <UIcon :name="ICONS.userPlus" class="size-4 text-info flex-shrink-0" />
          <span class="text-sm text-muted">Gæst af</span>
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
                variant="subtle"
                :size="SIZES.xs"
              >
                {{ row.original.ticketConfig.label }}{{ row.original.guestCount && row.original.guestCount > 1 ? ` ×${row.original.guestCount}` : '' }}
              </UBadge>
            </template>
          </UserListItem>
          <span v-else class="text-sm">ukendt</span>
        </div>
        <!-- Guest add row -->
        <div v-else-if="row.original.rowType === 'guest-add'" class="flex items-center gap-1">
          <UIcon :name="COMPONENTS.guestRow.addIcon" :class="COMPONENTS.guestRow.iconClass" />
          <span :class="[TYPOGRAPHY.bodyText, 'text-muted']">{{ row.original.name }}</span>
        </div>
      </template>

      <!-- Dynamic event columns - cells -->
      <template v-for="event in flatEvents" :key="event.id" #[`event-${event.id}-cell`]="{row}">
        <!-- Power row: consensus mode or ? (DinnerModeSelector handles both) -->
        <DinnerModeSelector
          v-if="row.original.rowType === 'power'"
          :model-value="getEventConsensus(event.id).mode"
          :form-mode="isEventDisabled(event) ? FORM_MODES.VIEW : effectiveFormMode"
          :interaction="effectiveFormMode === FORM_MODES.EDIT && !isEventDisabled(event) ? 'toggle' : 'buttons'"
          :disabled-modes="getPowerDisabledModes(event)"
          :consensus="getEventConsensus(event.id).hasConsensus"
          :size="SIZES.standard"
          :name="`power-${event.id}`"
          @update:model-value="(mode: DinnerMode) => handlePowerUpdate(event.id, mode)"
        />
        <!-- Inhabitant row -->
        <DinnerModeSelector
          v-else-if="row.original.rowType === 'inhabitant' && row.original.inhabitant"
          :model-value="getCellMode(row.original.inhabitant.id, event.id)"
          :form-mode="isEventDisabled(event) ? FORM_MODES.VIEW : effectiveFormMode"
          :interaction="effectiveFormMode === FORM_MODES.EDIT && !isEventDisabled(event) ? 'toggle' : 'buttons'"
          :disabled-modes="getCellDisabledModes(row.original.inhabitant.id, event)"
          :size="SIZES.standard"
          :name="`cell-${row.original.inhabitant.id}-${event.id}`"
          :is-modified="isCellModified(row.original.inhabitant.id, event.id)"
          @update:model-value="(mode: DinnerMode) => handleCellUpdate(row.original.inhabitant!.id, event.id, mode)"
        />
        <!-- Guest order row - show mode for orders in this event -->
        <DinnerModeSelector
          v-else-if="row.original.rowType === 'guest-order' && row.original.guestOrders?.some(o => o.dinnerEventId === event.id)"
          :model-value="row.original.guestOrders.find(o => o.dinnerEventId === event.id)!.dinnerMode"
          :form-mode="FORM_MODES.VIEW"
          :size="SIZES.standard"
          :name="`guest-${row.original.id}-${event.id}`"
        />
        <!-- Guest add row: + button for future events -->
        <UButton
          v-else-if="row.original.rowType === 'guest-add' && !isEventDisabled(event) && canBookEvent(event)"
          :icon="activeGuestEventId === event.id ? ICONS.chevronDown : ICONS.plusCircle"
          :color="COMPONENTS.guestRow.color"
          variant="ghost"
          :size="SIZES.standard"
          :data-testid="`guest-add-${event.id}`"
          :class="activeGuestEventId === event.id ? 'rotate-45' : ''"
          class="transition-transform duration-200"
          @click="handleGuestAdd(event.id)"
        />
      </template>

      <!-- Dynamic event column footers: ticket counts + price on separate lines -->
      <template v-for="event in flatEvents" :key="`footer-${event.id}`" #[`event-${event.id}-footer`]>
        <div class="flex flex-col items-center">
          <span>{{ getEventSummary(event.id).ticketCounts }}</span>
          <span class="text-muted">{{ formatPrice(getEventSummary(event.id).totalPrice) }} kr</span>
        </div>
      </template>

      <!-- Expanded row: GuestBookingForm for guest-add row -->
      <template #expanded="{row}">
        <GuestBookingForm
          v-if="row.original.rowType === 'guest-add' && activeGuestEvent && props.bookerId"
          :dinner-event="activeGuestEvent"
          :ticket-prices="props.ticketPrices"
          :allergy-types="props.allergyTypes"
          :deadlines="props.deadlines"
          :booker-id="props.bookerId"
          :booker-name="props.household.inhabitants.find(i => i.id === props.bookerId)?.name ?? 'Ukendt'"
          :released-ticket-counts="props.lockStatus.get(activeGuestEvent.id) ?? { total: 0, formatted: '-' }"
          :is-household-in-residency="isHouseholdInResidency(activeGuestEvent.date)"
          @save="handleGuestSave"
          @cancel="expanded = {}"
        />
      </template>

      <!-- Footer: Cancel/Save buttons (ADR-016) - using body-bottom slot per NuxtUI docs -->
      <template v-if="formMode === FORM_MODES.EDIT" #body-bottom>
        <tr>
          <td :colspan="columns.length" class="px-2 py-2 border-t border-default">
            <div class="flex flex-col gap-2">
              <!-- Action preview: show what will happen when saving -->
              <ActionPreview :items="actionPreviewItems" />

              <!-- Buttons row -->
              <div class="flex flex-col-reverse md:flex-row md:justify-end gap-2">
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
    <UAlert
      v-if="view !== 'day'"
      :color="COLOR.neutral"
      variant="subtle"
      :icon="ICONS.info"
      class="mt-4"
    >
      <template #title>Forklaring</template>
      <template #description>
        <div class="flex flex-wrap gap-x-6 gap-y-2">
          <DinnerModeSelector :model-value="DinnerModeEnum.DINEIN" :form-mode="FORM_MODES.VIEW" show-label :size="SIZES.xs" />
          <DinnerModeSelector :model-value="DinnerModeEnum.DINEINLATE" :form-mode="FORM_MODES.VIEW" show-label :size="SIZES.xs" />
          <DinnerModeSelector :model-value="DinnerModeEnum.TAKEAWAY" :form-mode="FORM_MODES.VIEW" show-label :size="SIZES.xs" />
          <DinnerModeSelector :model-value="DinnerModeEnum.NONE" :form-mode="FORM_MODES.VIEW" show-label :size="SIZES.xs" />
          <DinnerModeSelector :model-value="DinnerModeEnum.DINEIN" :form-mode="FORM_MODES.VIEW" show-label :size="SIZES.xs" :consensus="false" />
          <!-- Modified indicator: show border accent with custom label -->
          <div class="flex flex-col items-center gap-0.5">
            <DinnerModeSelector :model-value="DinnerModeEnum.DINEIN" :form-mode="FORM_MODES.VIEW" :size="SIZES.xs" :is-modified="true" />
            <span :class="TYPOGRAPHY.finePrint">Ændret</span>
          </div>
        </div>
        <p :class="[TYPOGRAPHY.finePrint, 'mt-2 text-muted']">Klik på en celle for at ændre din booking, den cykler igennem mulighederne. Når du er færdig, husk at trykke gem.</p>
      </template>
    </UAlert>
  </div>
</template>
