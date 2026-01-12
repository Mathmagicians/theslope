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
 * ├──────────┬───────┬──────┬──────╫──────┬──────┬──────╫──────┤
 * │ Beboer   │ Antal │  M   │  T   ║  O   │  T   │  F   ║  S   │
 * │          │       │ 13/1 │ 14/1 ║ 15/1 │ 16/1 │ 17/1 ║ 19/1 │
 * │          │       │      │      ║      │      │      ║      │ <- chip row (fixed h)
 * ├──────────┼───────┼──────┼──────╫──────┼──────┼──────╫──────┤
 * │⚡Alle    │       │  🍽️  │  ?   ║  🍽️  │  🍽️  │  🍽️  ║  ❌  │ <- consensus
 * ├──────────┼───────┼──────┼──────╫──────┼──────┼──────╫──────┤
 * │ Anna     │   4   │  🍽️  │  🍽️  ║  🛍️  │  🍽️  │  🍽️  ║  ❌  │
 * │ Lars     │   3   │  🍽️  │  🕐  ║  🍽️  │  ❌  │  🍽️  ║  ❌  │
 * ├──────────┼───────┼──────┼──────╫──────┼──────┼──────╫──────┤
 * │ 🎫 Gæst  │   1   │  🍽️  │      ║      │      │  🍽️  ║      │ <- existing guest
 * └──────────┴───────┴──────┴──────╨──────┴──────┴──────╨──────┘
 *                     ↑ past columns muted
 *
 * EDIT MODE:
 * ┌─────────────────────────────────────────────────────────────┐
 * │  ◀  Uge 3 (13-19 jan)  ▶                                   │
 * ├──────────┬───────┬──────┬──────╫──────┬──────┬──────╫──────┤
 * │ Beboer   │ Antal │ 13   │ 14   ║ 15   │To 16 │Fr 17 ║Sø 19 │
 * │          │       │(🟠)  │(🟡2) ║(🟠)  │      │      ║      │ <- chip: 🟠=locked, 🟡N=tickets
 * ├──────────┼───────┼──────┼──────╫──────┼──────┼──────╫──────┤
 * │⚡Alle    │       │  🍽️  │  ?   ║  🍽️  │  🍽️  │  ?°  ║  ❌  │ <- past=view, future=edit
 * ├──────────┼───────┼──────┼──────╫──────┼──────┼──────╫──────┤
 * │ Anna     │   4   │  🍽️  │  🍽️  ║  🛍️  │  🍽️  │  🍽️° ║  ❌  │
 * │ Lars     │   3   │  🍽️  │  🕐  ║  🍽️  │  ❌° │  🍽️  ║  ❌  │
 * ├──────────┼───────┼──────┼──────╫──────┼──────┼──────╫──────┤
 * │ 🎫 Gæst  │   1   │  🍽️  │      ║      │      │  🍽️  ║      │ <- existing guest
 * │ ➕ Gæst │       │      │      ║      │  +   │  +   ║  +   │ <- add guest (future only)
 * ├──────────┴───────┴──────┴──────╨──────┴──────┴──────╨──────┤
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
import type {DinnerEventDisplay, OrderDisplay, DinnerMode} from '~/composables/useBookingValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import type {SeasonDeadlines} from '~/composables/useSeason'
import type {BookingView} from '~/composables/useBookingView'
import type {DateRange} from '~/types/dateTypes'
import {FORM_MODES, type FormMode} from '~/types/form'

// Row types for synthetic rows (same pattern as HouseholdCard)
type RowType = 'power' | 'inhabitant' | 'guest-order' | 'guest-add'

interface GridRow {
  rowType: RowType
  id: number | string
  name: string
  inhabitant?: InhabitantDisplay
  inhabitants?: InhabitantDisplay[] // For power mode
  guestOrder?: OrderDisplay // For existing guest bookings
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
  formMode?: FormMode
}

const props = withDefaults(defineProps<Props>(), {
  formMode: FORM_MODES.VIEW
})

const emit = defineEmits<{
  save: [changes: { inhabitantId: number, dinnerEventId: number, dinnerMode: DinnerMode }[]]
  cancel: []
  'update:formMode': [mode: FormMode]
  navigate: [direction: 'prev' | 'next']
  addGuest: [eventId: number]
}>()

// Design system
const {ICONS, COLOR, SIZES, COMPONENTS, TYPOGRAPHY, getRandomEmptyMessage, getOrderStateColor} = useTheSlopeDesignSystem()
const emptyState = getRandomEmptyMessage('noDinners')

// Billing (for ticket count format) and ticket (for price format)
const {formatTicketCounts} = useBilling()
const {formatPrice} = useTicket()

// Validation schemas
const {DinnerModeSchema, OrderStateSchema} = useBookingValidation()
const DinnerModeEnum = DinnerModeSchema.enum
const OrderStateEnum = OrderStateSchema.enum

// ============================================================================
// DRAFT STATE (ADR-016)
// ============================================================================

const draftChanges = ref<Map<string, DinnerMode>>(new Map())
const hasPendingChanges = computed(() => draftChanges.value.size > 0)
const pendingChangeCount = computed(() => draftChanges.value.size)

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
    {id: 'name', header: 'Beboer', footer: () => 'Sum', size: 150},
    {id: 'count', header: 'Antal', footer: () => '', size: 60}
  ]

  // Dynamic columns for each dinner event (footer shows ticket counts + price)
  const eventColumns = flatEvents.value.map((event, idx) => ({
    id: `event-${event.id}`,
    header: formatCompactWeekdayDate(event.date),
    footer: () => {
      const summary = getEventSummary(event.id)
      return `${summary.ticketCounts} · ${formatPrice(summary.totalPrice)} kr`
    },
    size: 50,
    meta: {
      eventId: event.id,
      isWeekBoundary: isFirstEventOfWeek(event, idx)
    }
  }))

  return [...fixedColumns, ...eventColumns]
})

// Column pinning - fixed columns on left
const columnPinning = ref({
  left: ['name', 'count'],
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

  // Guest order rows (existing guest bookings)
  guestOrders.value.forEach((order, idx) => {
    rows.push({
      rowType: 'guest-order',
      id: `guest-${order.id}`,
      name: `Gæst ${idx + 1}`,
      guestOrder: order,
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

// Week boundary lookup by eventId (for template use)
const weekBoundaryIds = computed(() => new Set(
  flatEvents.value
    .filter((e, idx) => isFirstEventOfWeek(e, idx))
    .map(e => e.id)
))

// ============================================================================
// DEADLINE LOGIC (same pattern as DinnerBookingForm)
// ============================================================================

const {isDinnerPast} = useSeason()
const {canModifyOrders, canEditDiningMode} = props.deadlines

const isEventPast = (event: DinnerEventDisplay): boolean => isDinnerPast(event.date)
const canBookEvent = (event: DinnerEventDisplay): boolean => canModifyOrders(event.date)
const canChangeEventMode = (event: DinnerEventDisplay): boolean => canEditDiningMode(event.date)

// Disabled modes for event (same pattern as DinnerBookingForm.disabledModes)
const getDisabledModesForEvent = (event: DinnerEventDisplay): DinnerMode[] => {
  if (isEventPast(event)) return [DinnerModeEnum.DINEIN, DinnerModeEnum.DINEINLATE, DinnerModeEnum.TAKEAWAY, DinnerModeEnum.NONE]
  if (!canChangeEventMode(event)) return [DinnerModeEnum.DINEIN, DinnerModeEnum.DINEINLATE, DinnerModeEnum.TAKEAWAY]
  return []
}

// Lock status for column header chips (reuse calendar pattern)
const {BOOKING_LOCK_STATUS: _BOOKING_LOCK_STATUS, getLockStatusConfig} = useTheSlopeDesignSystem()

const getEventLockStatus = (event: DinnerEventDisplay): { config: typeof _BOOKING_LOCK_STATUS.locked, count: number } | null => {
  if (canBookEvent(event)) return null // Not locked
  if (isEventPast(event)) return null // Past events don't show lock chip
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

  if (props.view === 'week') {
    const weekNum = getWeekNumber(props.dateRange.start)
    const startDay = props.dateRange.start.getDate()
    const endDay = props.dateRange.end.getDate()
    const monthName = props.dateRange.start.toLocaleDateString('da-DK', { month: 'short' })
    return `Uge ${weekNum} (${startDay}-${endDay} ${monthName})`
  }
  return props.dateRange.start.toLocaleDateString('da-DK', { month: 'long', year: 'numeric' })
})

const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

// ============================================================================
// GUEST ORDERS
// ============================================================================

const guestOrders = computed(() =>
  props.orders.filter(o => o.inhabitantId === null || !props.household.inhabitants.some(i => i.id === o.inhabitantId))
)

// ============================================================================
// EVENT SUMMARIES (for footer - matches economy view format)
// ============================================================================

const getEventSummary = (eventId: number): { ticketCounts: string, totalPrice: number } => {
  const eventOrders = props.orders.filter(o =>
    o.dinnerEventId === eventId &&
    o.dinnerMode !== DinnerModeEnum.NONE &&
    (o.state === OrderStateEnum.BOOKED || o.state === OrderStateEnum.RELEASED)
  )
  return {
    ticketCounts: formatTicketCounts(eventOrders),
    totalPrice: eventOrders.reduce((sum, o) => sum + o.priceAtBooking, 0)
  }
}
</script>

<template>
  <div data-testid="booking-grid-view" class="flex flex-col">
    <!-- Navigation Header -->
    <div class="flex items-center justify-between px-2 py-2 border-b border-default">
      <div class="flex items-center gap-2">
        <UButton
          :icon="ICONS.arrowLeft"
          :color="COLOR.neutral"
          variant="ghost"
          :size="SIZES.sm"
          data-testid="grid-nav-prev"
          @click="emit('navigate', 'prev')"
        />
        <span class="text-sm font-medium">{{ navigationLabel }}</span>
        <UButton
          :icon="ICONS.arrowRight"
          :color="COLOR.neutral"
          variant="ghost"
          :size="SIZES.sm"
          data-testid="grid-nav-next"
          @click="emit('navigate', 'next')"
        />
      </div>
      <!-- Pencil button to enter edit mode (VIEW only) -->
      <UButton
        v-if="formMode === FORM_MODES.VIEW"
        :icon="ICONS.edit"
        :color="COLOR.neutral"
        variant="ghost"
        :size="SIZES.sm"
        data-testid="grid-edit"
        @click="emit('update:formMode', FORM_MODES.EDIT)"
      />
    </div>

    <!-- Grid Table -->
    <UTable
      v-model:column-pinning="columnPinning"
      sticky
      :data="tableData"
      :columns="columns"
      row-key="id"
      :ui="{
        tbody: '[&_tr:first-child]:bg-warning/10',
        th: 'px-1 py-1 md:px-2 md:py-2',
        td: 'px-1 py-1 md:px-2',
        tfoot: 'sticky bottom-0 bg-default',
        tf: 'px-1 py-1 md:px-2 text-center text-xs'
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
          :class="[
            { 'text-muted': isEventPast(event) },
            weekBoundaryIds.has(event.id) ? 'border-l-2 border-primary pl-1' : ''
          ]"
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
        <div v-if="row.original.rowType === 'power'" class="flex items-center gap-1">
          <UIcon :name="COMPONENTS.powerMode.buttonIcon" :class="COMPONENTS.powerMode.iconClass" />
          <UBadge :color="COMPONENTS.powerMode.color" variant="subtle" :size="SIZES.xs">
            Powermode!
          </UBadge>
        </div>
        <!-- Inhabitant row -->
        <UserListItem
          v-else-if="row.original.rowType === 'inhabitant' && row.original.inhabitant"
          :inhabitants="row.original.inhabitant"
          :link-to-profile="false"
          compact
        />
        <!-- Guest order row -->
        <div v-else-if="row.original.rowType === 'guest-order'" class="flex items-center gap-1">
          <UIcon :name="COMPONENTS.guestRow.orderIcon" :class="COMPONENTS.guestRow.iconClass" />
          <span :class="TYPOGRAPHY.body">{{ row.original.name }}</span>
        </div>
        <!-- Guest add row -->
        <div v-else-if="row.original.rowType === 'guest-add'" class="flex items-center gap-1">
          <UIcon :name="COMPONENTS.guestRow.addIcon" :class="COMPONENTS.guestRow.iconClass" />
          <span :class="[TYPOGRAPHY.body, 'text-muted']">{{ row.original.name }}</span>
        </div>
      </template>

      <!-- Count column (order count + released badge) -->
      <template #count-cell="{row}">
        <div v-if="row.original.rowType === 'inhabitant' && row.original.inhabitant" class="flex items-center gap-1">
          <span class="text-sm">{{ getOrderCountsForInhabitant(row.original.inhabitant.id).total }}</span>
          <UBadge
            v-if="getOrderCountsForInhabitant(row.original.inhabitant.id).released > 0"
            :color="getOrderStateColor(true, false)"
            variant="soft"
            :size="SIZES.small"
          >
            <UIcon :name="ICONS.released" class="size-3" />
            {{ getOrderCountsForInhabitant(row.original.inhabitant.id).released }}
          </UBadge>
        </div>
      </template>

      <!-- Dynamic event columns - cells -->
      <template v-for="event in flatEvents" :key="event.id" #[`event-${event.id}-cell`]="{row}">
        <div :class="weekBoundaryIds.has(event.id) ? 'border-l-2 border-primary pl-1' : ''">
          <!-- Power row: consensus mode or ? (DinnerModeSelector handles both) -->
          <DinnerModeSelector
            v-if="row.original.rowType === 'power'"
            :model-value="getEventConsensus(event.id).mode"
            :form-mode="isEventPast(event) ? FORM_MODES.VIEW : formMode"
            :interaction="formMode === FORM_MODES.EDIT && !isEventPast(event) ? 'toggle' : 'buttons'"
            :disabled-modes="getDisabledModesForEvent(event)"
            :consensus="getEventConsensus(event.id).hasConsensus"
            :size="SIZES.xs"
            :name="`power-${event.id}`"
            @update:model-value="(mode: DinnerMode) => handlePowerUpdate(event.id, mode)"
          />

          <!-- Inhabitant row -->
          <DinnerModeSelector
            v-else-if="row.original.rowType === 'inhabitant' && row.original.inhabitant"
            :model-value="getCellMode(row.original.inhabitant.id, event.id)"
            :form-mode="isEventPast(event) ? FORM_MODES.VIEW : formMode"
            :interaction="formMode === FORM_MODES.EDIT && !isEventPast(event) ? 'toggle' : 'buttons'"
            :disabled-modes="getDisabledModesForEvent(event)"
            :size="SIZES.xs"
            :name="`cell-${row.original.inhabitant.id}-${event.id}`"
            :is-modified="isCellModified(row.original.inhabitant.id, event.id)"
            @update:model-value="(mode: DinnerMode) => handleCellUpdate(row.original.inhabitant!.id, event.id, mode)"
          />

          <!-- Guest order row -->
          <DinnerModeSelector
            v-else-if="row.original.rowType === 'guest-order' && row.original.guestOrder?.dinnerEventId === event.id"
            :model-value="row.original.guestOrder.dinnerMode"
            :form-mode="FORM_MODES.VIEW"
            :size="SIZES.xs"
            :name="`guest-${row.original.guestOrder.id}-${event.id}`"
          />

          <!-- Guest add row: + button for future events -->
          <UButton
            v-else-if="row.original.rowType === 'guest-add' && !isEventPast(event) && canBookEvent(event)"
            :icon="ICONS.plusCircle"
            :color="COMPONENTS.guestRow.color"
            variant="ghost"
            :size="SIZES.xs"
            :data-testid="`guest-add-${event.id}`"
            @click="emit('addGuest', event.id)"
          />
        </div>
      </template>

      <!-- Footer: Cancel/Save buttons (ADR-016) - using body-bottom slot per NuxtUI docs -->
      <template v-if="formMode === FORM_MODES.EDIT" #body-bottom>
        <tr>
          <td :colspan="columns.length" class="px-2 py-2 border-t border-default">
            <div class="flex items-center gap-2">
              <UBadge v-if="hasPendingChanges" :color="COLOR.warning" variant="soft" :size="SIZES.xs">
                {{ pendingChangeCount }} ændringer
              </UBadge>
              <div class="flex-1" />
              <UButton
                :color="COLOR.neutral"
                variant="ghost"
                :size="SIZES.sm"
                data-testid="grid-cancel"
                @click="handleCancel"
              >
                Annuller
              </UButton>
              <UButton
                :color="COLOR.primary"
                :size="SIZES.sm"
                :disabled="!hasPendingChanges"
                data-testid="grid-save"
                @click="handleSave"
              >
                Gem
              </UButton>
            </div>
          </td>
        </tr>
      </template>
    </UTable>

    <!-- Legend: DinnerModeSelector in VIEW mode with labels (DRY) -->
    <UAlert
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
