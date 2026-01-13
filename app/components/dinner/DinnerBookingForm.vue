<script setup lang="ts">
/**
 * DinnerBookingForm - Reusable booking form for a single dinner event
 *
 * Expandable row pattern (like HouseholdCard):
 * - Collapsed: Pure info display (ticket VIEW mode)
 * - Expanded: UCard with edit controls + Cancel/Save footer
 *
 * MOBILE - Collapsed:
 * ┌─────────────────────────────────┐
 * │ [✏️] Anna Hansen                │
 * │ ┌─────────────────────────────┐ │
 * │ │ 🎟️ Voksen · 55kr · 🍽️      │ │
 * │ └─────────────────────────────┘ │
 * └─────────────────────────────────┘
 *
 * MOBILE - Expanded:
 * ┌─────────────────────────────────┐
 * │ [▼] Anna Hansen                 │
 * │ ┌─────────────────────────────┐ │
 * │ │ Vælg spisning:              │ │
 * │ │ [🍽️ Fællesspisning     ]   │ │
 * │ │ [🕐 Sen spisning       ]   │ │
 * │ │ [🛍️ Takeaway           ]   │ │
 * │ │ [❌ Ingen              ]   │ │
 * │ ├─────────────────────────────┤ │
 * │ │ [Annuller]        [Gem]     │ │
 * │ └─────────────────────────────┘ │
 * └─────────────────────────────────┘
 *
 * DESKTOP - Collapsed:
 * ┌──────────────────────────────────────────────────────┐
 * │ [✏️] Anna Hansen              │ 🎟️ Voksen 55kr 🍽️  │
 * └──────────────────────────────────────────────────────┘
 *
 * DESKTOP - Expanded:
 * ┌──────────────────────────────────────────────────────────┐
 * │ [▼] Anna Hansen                                         │
 * │ ┌──────────────────────────────────────────────────────┐ │
 * │ │ Vælg: [🍽️][🕐][🛍️][❌]           [Annuller] [Gem]  │ │
 * │ └──────────────────────────────────────────────────────┘ │
 * └──────────────────────────────────────────────────────────┘
 */
import type {HouseholdDetail, InhabitantDisplay} from '~/composables/useCoreValidation'
import type {DinnerEventDisplay, OrderDisplay, DinnerMode, OrderState, DesiredOrder} from '~/composables/useBookingValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import type {SeasonDeadlines} from '~/composables/useSeason'
import type {NuxtUIColor} from '~/composables/useTheSlopeDesignSystem'
import {FORM_MODES} from '~/types/form'

// Row types for synthetic rows in table
type RowType = 'inhabitant' | 'power' | 'guest' | 'guest-order'

// Ticket config type
type TicketConfig = {label: string; color: NuxtUIColor; icon: string} | null

interface TableRow {
  rowType: RowType
  id: number | string
  name: string
  lastName: string
  birthDate?: Date | null
  inhabitant?: InhabitantDisplay // For UserListItem in single mode
  inhabitants?: InhabitantDisplay[] // For UserListItem in group mode (power)
  ticketConfig: TicketConfig
  order: OrderDisplay | null
  orders?: OrderDisplay[] // For grouped guest orders
  orderState: OrderState | undefined
  dinnerMode: DinnerMode
  consensus?: boolean // Power mode: true=all agree, false=mixed
  price: number
  ticketPriceId: number
  guestCount?: number // undefined = not guest, 1+ = guest ticket(s)
  ticketCount?: number // DEBUG: total orders for this inhabitant (should be 1)
  provenanceHousehold?: string
  provenanceAllergies?: string[]
}

interface Props {
  household?: HouseholdDetail
  dinnerEvent: DinnerEventDisplay
  orders?: OrderDisplay[]
  allOrders?: OrderDisplay[]
  ticketPrices?: TicketPrice[]
  deadlines: SeasonDeadlines
}

const props = withDefaults(defineProps<Props>(), {
  household: undefined,
  orders: () => [],
  allOrders: () => [],
  ticketPrices: () => []
})

const emit = defineEmits<{
  saveBookings: [orders: DesiredOrder[]]
  cancel: []
}>()

// Self-initialize household store
const householdsStore = useHouseholdsStore()
const {selectedHousehold} = storeToRefs(householdsStore)
householdsStore.initHouseholdsStore()
const household = computed(() => props.household ?? selectedHousehold.value)

// Household business logic for consensus
const {computeConsensus} = useHousehold()

// Permission-based form mode - EDIT if user is member of household (ADR: permission in composable)
const {isHouseholdMember} = usePermissions()
const formMode = computed(() => {
  const householdId = household.value?.id
  if (!householdId) return FORM_MODES.VIEW
  return isHouseholdMember(householdId) ? FORM_MODES.EDIT : FORM_MODES.VIEW
})

// Inject responsive breakpoint
const isMd = inject<Ref<boolean>>('isMd')
const getIsMd = computed((): boolean => isMd?.value ?? false)

// Design system
const {COMPONENTS, SIZES, COLOR, TYPOGRAPHY, ICONS, getRandomEmptyMessage} = useTheSlopeDesignSystem()
const emptyStateMessage = getRandomEmptyMessage('household')

// Ticket business logic
const {getTicketTypeConfig, getTicketPriceForInhabitant, ticketTypeConfig} = useTicket()

// Season business logic
const {isDinnerPast} = useSeason()
const {canModifyOrders, canEditDiningMode} = props.deadlines

// Validation
const {DinnerModeSchema, OrderStateSchema} = useBookingValidation()
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

// Guest draft state as object for cleaner reset
const defaultGuestDraft = () => ({
  ticketPriceId: undefined as number | undefined,
  allergies: [] as number[],
  count: 1
})
const guestDraft = ref(defaultGuestDraft())

// Expandable row with callbacks
const {expanded} = useExpandableRow({
  onExpand: (rowIndex) => {
    const row = tableData.value[rowIndex]
    if (row) {
      editingRowId.value = row.id
      draftMode.value = row.dinnerMode
      if (row.rowType === 'guest') {
        guestDraft.value = defaultGuestDraft()
      }
    }
  },
  onCollapse: () => {
    editingRowId.value = null
    guestDraft.value = defaultGuestDraft()
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

// Disabled modes based on deadline
const disabledModes = computed(() =>
  canChangeDiningMode.value ? [] : [DinnerModeEnum.DINEIN, DinnerModeEnum.DINEINLATE, DinnerModeEnum.TAKEAWAY]
)

// Guest can't select NONE (must eat if adding)
const guestDisabledModes = computed(() => {
  const base = [DinnerModeEnum.NONE]
  if (!canChangeDiningMode.value) {
    return [...base, DinnerModeEnum.DINEIN, DinnerModeEnum.DINEINLATE, DinnerModeEnum.TAKEAWAY]
  }
  return base
})

// ============================================================================
// RELEASED TICKETS COMPUTEDS
// ============================================================================

const householdInhabitantIds = computed(() =>
  new Set(household.value?.inhabitants?.map(i => i.id) ?? [])
)

const releasedTicketsFromOthers = computed(() =>
  (props.allOrders ?? []).filter(o =>
    o.state === OrderStateEnum.RELEASED &&
    o.dinnerEventId === props.dinnerEvent.id &&
    !householdInhabitantIds.value.has(o.inhabitantId)
  )
)

const userReleasedTickets = computed(() =>
  (props.orders ?? []).filter(o =>
    o.state === OrderStateEnum.RELEASED &&
    o.dinnerEventId === props.dinnerEvent.id
  )
)

const releasedTicketCount = computed(() => releasedTicketsFromOthers.value.length)
const hasReleasedTickets = computed(() => releasedTicketCount.value > 0)

// ============================================================================
// ORDER PARTITIONING
// ============================================================================

const partitionedOrders = computed(() =>
  (props.orders ?? [])
    .filter(o => o.dinnerEventId === props.dinnerEvent.id)
    .reduce((acc, o) => {
      (o.isGuestTicket ? acc.guestOrders : acc.regularOrders).push(o)
      return acc
    }, {guestOrders: [] as OrderDisplay[], regularOrders: [] as OrderDisplay[]})
)
const guestOrders = computed(() => partitionedOrders.value.guestOrders)
const regularOrders = computed(() => partitionedOrders.value.regularOrders)

// ============================================================================
// TABLE CONFIGURATION
// ============================================================================

const columns = computed(() => [
  {id: 'expand'},
  {id: 'name', header: getIsMd.value ? 'Beboer' : 'Billetter'},
  {id: 'ticket', class: 'hidden md:table-cell'}  // No header - ticket inline on mobile
])

// Find the booker (inhabitant with userId) to show who invited guests
const bookerInhabitant = computed(() =>
  (household.value?.inhabitants as InhabitantDisplay[] | undefined)?.find(i => i.userId !== null) ?? null
)

const tableData = computed((): TableRow[] => {
  if (!household.value?.inhabitants) return []

  const allInhabitants = household.value.inhabitants as InhabitantDisplay[]

  const inhabitantRows: TableRow[] = allInhabitants.map(inhabitant => {
    // Find ALL orders for this inhabitant (to detect duplicates)
    const ordersForInhabitant = regularOrders.value.filter(o => o.inhabitantId === inhabitant.id)
    const order = ordersForInhabitant[0] ?? null
    const ticketCount = ordersForInhabitant.length
    const ticketConfig = getTicketTypeConfig(inhabitant.birthDate ?? null, props.ticketPrices)
    const ticketPrice = getTicketPriceForInhabitant(inhabitant.birthDate ?? null, props.ticketPrices)

    // Existing order: preserve ticketPriceId. New booking: compute from age.
    const resolvedTicketPriceId = order?.ticketPriceId ?? ticketPrice?.id
    if (!resolvedTicketPriceId) {
      throw new Error(`Cannot resolve ticketPriceId for inhabitant ${inhabitant.id}`)
    }

    return {
      rowType: 'inhabitant' as RowType,
      id: inhabitant.id,
      name: inhabitant.name,
      lastName: inhabitant.lastName,
      birthDate: inhabitant.birthDate,
      inhabitant,
      ticketConfig,
      order,
      orderState: order?.state as OrderState | undefined,
      dinnerMode: order?.dinnerMode ?? DinnerModeEnum.NONE,
      price: order?.priceAtBooking ?? ticketPrice?.price ?? 0,
      ticketPriceId: resolvedTicketPriceId,
      ticketCount: ticketCount > 1 ? ticketCount : undefined, // Only set if duplicates
      provenanceHousehold: order?.provenanceHousehold,
      provenanceAllergies: order?.provenanceAllergies
    }
  })

  // Group guest orders by (booker, ticketType)
  const guestOrderGroups = guestOrders.value.reduce((acc, order) => {
    const key = `${order.inhabitantId}-${order.ticketType}`
    if (!acc[key]) acc[key] = []
    acc[key].push(order)
    return acc
  }, {} as Record<string, OrderDisplay[]>)

  const guestOrderRows: TableRow[] = Object.entries(guestOrderGroups)
    .filter(([, orders]) => orders.length > 0)
    .map(([key, orders]) => {
      const firstOrder = orders[0]!
      const booker = allInhabitants.find(i => i.id === firstOrder.inhabitantId)

      // Guest order must have ticketPriceId
      if (!firstOrder.ticketPriceId) {
        throw new Error(`Guest order ${firstOrder.id} missing ticketPriceId`)
      }

      return {
        rowType: 'guest-order' as RowType,
        id: `guest-group-${key}`,
        name: 'Gæst',
        lastName: '',
        inhabitant: booker,
        ticketConfig: firstOrder.ticketType ? ticketTypeConfig[firstOrder.ticketType] : null,
        order: firstOrder,
        orders,
        orderState: firstOrder.state as OrderState,
        dinnerMode: firstOrder.dinnerMode,
        price: firstOrder.priceAtBooking,
        ticketPriceId: firstOrder.ticketPriceId,
        guestCount: orders.length,
        provenanceHousehold: firstOrder.provenanceHousehold,
        provenanceAllergies: firstOrder.provenanceAllergies
      }
    })

  // Compute consensus from inhabitant dinnerModes
  const inhabitantModes = inhabitantRows.map(r => r.dinnerMode)
  const {value: consensusMode, consensus: hasConsensus} = computeConsensus(inhabitantModes, DinnerModeEnum.DINEIN)

  // Default synthetic row template
  const defaultSyntheticRow = {
    lastName: '',
    ticketConfig: null,
    order: null,
    orderState: undefined as OrderState | undefined,
    price: 0,
    ticketPriceId: 0
  }

  // Power row with consensus (shown in both VIEW and EDIT modes)
  const powerRow: TableRow = {
    ...defaultSyntheticRow,
    rowType: 'power' as RowType,
    id: 'power-mode',
    name: 'Hele familien',
    inhabitants: allInhabitants,
    ticketConfig: COMPONENTS.powerMode.ticketConfig,
    dinnerMode: consensusMode,
    consensus: hasConsensus
  }

  // VIEW mode: power + inhabitants + guest orders
  if (!isEditModeAllowed.value) return [powerRow, ...inhabitantRows, ...guestOrderRows]

  // EDIT mode: power + inhabitants + guest orders + add guest
  return [
    powerRow,
    ...inhabitantRows,
    ...guestOrderRows,
    {...defaultSyntheticRow, rowType: 'guest' as RowType, id: 'add-guest', name: 'Tilføj gæst', dinnerMode: DinnerModeEnum.DINEIN}
  ]
})

// ============================================================================
// HANDLERS
// ============================================================================

const handleSave = async (row: TableRow) => {
  isSaving.value = true

  try {
    const dinnerEventId = props.dinnerEvent.id
    let orders: DesiredOrder[] = []

    if (row.rowType === 'power') {
      // Power mode: all inhabitants with same mode
      // State is BOOKED when user actively books - RELEASED is only set by scaffolder for NONE after deadline
      orders = tableData.value
        .filter((r: TableRow) => r.rowType === 'inhabitant')
        .map((r: TableRow) => ({
          inhabitantId: r.id as number,
          dinnerEventId,
          dinnerMode: draftMode.value,
          ticketPriceId: r.ticketPriceId,
          isGuestTicket: false,
          orderId: r.order?.id,
          state: OrderStateEnum.BOOKED
        }))
    } else if (row.rowType === 'guest') {
      // Add new guest ticket(s) - linked to the booker (user's inhabitant)
      // No orderId - these are creates, state = BOOKED
      const bookerId = bookerInhabitant.value?.id
      const {ticketPriceId, allergies, count} = guestDraft.value
      if (bookerId && ticketPriceId) {
        orders = Array.from({length: count}, () => ({
          inhabitantId: bookerId,
          dinnerEventId,
          dinnerMode: draftMode.value,
          ticketPriceId,
          isGuestTicket: true,
          allergyTypeIds: allergies.length > 0 ? allergies : undefined,
          state: OrderStateEnum.BOOKED
        }))
      }
    } else if (row.rowType === 'guest-order') {
      // Update existing guest
      // State is BOOKED when user actively books - RELEASED is only set by scaffolder for NONE after deadline
      const inhabitantId = row.order?.inhabitantId
      if (inhabitantId) {
        orders = [{
          inhabitantId,
          dinnerEventId,
          dinnerMode: draftMode.value,
          ticketPriceId: row.ticketPriceId,
          isGuestTicket: true,
          orderId: row.order?.id,
          state: OrderStateEnum.BOOKED
        }]
      }
    } else {
      // Update single inhabitant
      // State is BOOKED when user actively books - RELEASED is only set by scaffolder for NONE after deadline
      if (typeof row.id === 'number') {
        orders = [{
          inhabitantId: row.id,
          dinnerEventId,
          dinnerMode: draftMode.value,
          ticketPriceId: row.ticketPriceId,
          isGuestTicket: false,
          orderId: row.order?.id,
          state: OrderStateEnum.BOOKED
        }]
      }
    }

    if (orders.length > 0) {
      emit('saveBookings', orders)
    }

    // Collapse row after save (onCollapse callback handles cleanup)
    expanded.value = {}
  } finally {
    isSaving.value = false
  }
}

const handleCancel = () => {
  expanded.value = {}
  emit('cancel')
}

const isOrderReleased = (orderState: OrderState | undefined): boolean => orderState === OrderStateEnum.RELEASED
const isTicketClaimed = (row: TableRow): boolean => !!row.provenanceHousehold

// ============================================================================
// HELPER TEXT
// ============================================================================

const {DEADLINE_LABELS} = useBooking()

const deadlineStatusBadges = computed(() => [
  {
    label: DEADLINE_LABELS.BOOKING_CLOSED.label,
    isOpen: canBook.value,
    openText: DEADLINE_LABELS.BOOKING_CLOSED.openText,
    closedText: DEADLINE_LABELS.BOOKING_CLOSED.closedText
  },
  {
    label: 'Hvordan spiser I',
    isOpen: canChangeDiningMode.value,
    openText: 'Du kan ændre til spisesal, sen spisning eller takeaway',
    closedText: 'Du kan ikke længere ændre, hvordan I spiser'
  }
])

// Allergy type options for multi-select
const allergyOptions = computed(() =>
  (allergyTypes.value ?? []).map(a => ({
    label: a.name,
    value: a.id
  }))
)
</script>

<template>
  <!-- Empty state -->
  <UAlert
    v-if="!household?.inhabitants?.length"
    :color="COLOR.neutral"
    variant="soft"
    :avatar="{text: emptyStateMessage.emoji, size: SIZES.emptyStateAvatar}"
    :ui="COMPONENTS.emptyStateAlert"
  >
    <template #title>{{ emptyStateMessage.text }}</template>
    <template #description>Ingen husstandsmedlemmer fundet</template>
  </UAlert>

  <!-- Booking form -->
  <div v-else class="space-y-4">
    <!-- Deadline Status Badges -->
    <div class="flex flex-wrap gap-4">
      <div v-for="badge in deadlineStatusBadges" :key="badge.label" class="flex flex-col items-start">
        <UBadge
          :color="badge.isOpen ? COLOR.success : COLOR.error"
          variant="soft"
          :size="SIZES.small"
          :icon="badge.isOpen ? ICONS.lockOpen : ICONS.lockClosed"
        >
          {{ badge.label }}: {{ badge.isOpen ? 'Åben' : 'Lukket' }}
        </UBadge>
        <span :class="[TYPOGRAPHY.finePrint, 'text-gray-500 dark:text-gray-400 mt-0.5']">
          {{ badge.isOpen ? badge.openText : badge.closedText }}
        </span>
      </div>
    </div>

    <!-- Released Ticket Warnings -->
    <div v-if="!canBook" class="space-y-2">
      <UAlert
        v-if="userReleasedTickets.length > 0"
        color="warning"
        variant="soft"
        :icon="ICONS.released"
      >
        <template #title>
          Du har frigivet {{ userReleasedTickets.length }} billet{{ userReleasedTickets.length === 1 ? '' : 'ter' }}
        </template>
        <template #description>Du betaler, medmindre andre køber</template>
      </UAlert>
      <UAlert v-if="hasReleasedTickets" color="info" variant="soft" icon="i-heroicons-ticket">
        <template #title>🎟️ {{ releasedTicketCount }} ledig{{ releasedTicketCount === 1 ? ' billet' : 'e billetter' }}</template>
      </UAlert>
    </div>

    <!-- Main Table with Expandable Rows -->
    <UTable
      v-model:expanded="expanded"
      :data="tableData"
      :columns="columns"
      row-key="id"
      data-testid="booking-table"
      :ui="{tbody: '[&_tr:first-child]:bg-warning/10', tr: 'data-[expanded=true]:bg-elevated/50', th: 'px-1 py-1 md:px-4 md:py-3', td: 'px-1 md:px-4'}"
    >
      <!-- Expand button column -->
      <template #expand-cell="{row}">
        <UButton
          v-if="isEditModeAllowed"
          color="neutral"
          variant="ghost"
          :icon="row.getIsExpanded() ? ICONS.chevronDown : (row.original.rowType === 'power' ? COMPONENTS.powerMode.buttonIcon : (row.original.rowType === 'guest' ? ICONS.plusCircle : ICONS.edit))"
          square
          :size="getIsMd ? 'md' : 'xs'"
          :aria-label="row.getIsExpanded() ? 'Luk' : 'Rediger'"
          :data-testid="`${row.original.rowType}-${row.original.id}-toggle`"
          :class="[row.getIsExpanded() ? 'rotate-180' : '', row.original.rowType === 'power' && !row.getIsExpanded() ? 'hover:animate-pulse hover:text-warning' : '']"
          class="transition-all duration-300"
          @click="row.toggleExpanded()"
        />
      </template>

      <!-- Name Column -->
      <template #name-cell="{row}">
        <div class="py-1">
          <!-- Power Mode Row - UserListItem in GROUP mode with ticket below -->
          <div v-if="row.original.rowType === 'power' && row.original.inhabitants" class="flex flex-col gap-0.5">
            <UserListItem
              :inhabitants="row.original.inhabitants"
              :show-names="false"
              :link-to-profile="false"
              compact
              label="beboere"
            />
            <!-- DinnerTicket for power row (mobile only - desktop in ticket-cell) -->
            <div class="md:hidden mt-2">
              <DinnerTicket
                :ticket-config="row.original.ticketConfig"
                :price="row.original.price"
                :dinner-mode="row.original.dinnerMode"
                :consensus="row.original.consensus"
              />
            </div>
          </div>

          <!-- Guest Add Row -->
          <div v-else-if="row.original.rowType === 'guest'" class="flex items-center gap-2">
            <UIcon :name="ICONS.userPlus" class="size-4 md:size-5 text-info" />
            <span :class="TYPOGRAPHY.bodyTextMedium">{{ row.original.name }}</span>
            <UBadge v-if="hasReleasedTickets" :color="COLOR.info" variant="subtle" :size="SIZES.small">
              🎟️ {{ releasedTicketCount }} ledige
            </UBadge>
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
                  v-if="isOrderReleased(row.original.orderState)"
                  :color="COLOR.error"
                  variant="soft"
                  :size="SIZES.small"
                  :icon="ICONS.released"
                >
                  FRIGIVET
                </UBadge>
                <!-- Provenance badges -->
                <div v-else-if="row.original.provenanceHousehold" class="flex flex-wrap items-center gap-1">
                  <UBadge :color="COLOR.info" variant="soft" size="sm" :icon="ICONS.ticket">
                    fra {{ row.original.provenanceHousehold }}
                  </UBadge>
                  <UBadge v-if="row.original.provenanceAllergies?.length" :color="COLOR.warning" variant="soft" size="sm">
                    🥜 {{ row.original.provenanceAllergies.join(', ') }}
                  </UBadge>
                </div>
              </template>
            </UserListItem>
          </div>

          <!-- Guest Order Row - show who invited using UserListItem -->
          <div v-else-if="row.original.rowType === 'guest-order'">
            <div class="flex items-center gap-2">
              <UIcon :name="ICONS.userPlus" class="size-4 text-info flex-shrink-0" />
              <span class="text-sm text-muted">Gæst af</span>
              <UserListItem
                v-if="row.original.inhabitant"
                :inhabitants="row.original.inhabitant"
                :link-to-profile="false"
                compact
                :show-names="true"
              />
              <span v-else class="text-sm">ukendt</span>
            </div>
            <!-- Provenance badges -->
            <div v-if="row.original.provenanceHousehold" class="flex flex-wrap items-center gap-1 mt-1 ml-6">
              <UBadge :color="COLOR.info" variant="soft" size="sm" :icon="ICONS.ticket">
                fra {{ row.original.provenanceHousehold }}
              </UBadge>
              <UBadge v-if="row.original.provenanceAllergies?.length" :color="COLOR.warning" variant="soft" size="sm">
                🥜 {{ row.original.provenanceAllergies.join(', ') }}
              </UBadge>
            </div>
          </div>

          <!-- Mobile: Ticket inline (for inhabitant/guest-order rows only) -->
          <div v-if="row.original.rowType === 'inhabitant' || row.original.rowType === 'guest-order'" class="mt-2 md:hidden">
            <DinnerTicket
              :ticket-config="row.original.ticketConfig"
              :price="row.original.price"
              :dinner-mode="row.original.dinnerMode"
              :is-released="isOrderReleased(row.original.orderState)"
              :is-claimed="isTicketClaimed(row.original)"
              :guest-count="row.original.guestCount"
              :ticket-count="row.original.ticketCount"
              :allergies="row.original.provenanceAllergies"
              :provenance-household="row.original.provenanceHousehold"
            />
          </div>
        </div>
      </template>

      <!-- Ticket Column (desktop only) -->
      <template #ticket-cell="{row}">
        <!-- Power row: show DinnerTicket with consensus (desktop) -->
        <div v-if="row.original.rowType === 'power'" class="hidden md:block">
          <DinnerTicket
            :ticket-config="row.original.ticketConfig"
            :price="row.original.price"
            :dinner-mode="row.original.dinnerMode"
            :consensus="row.original.consensus"
          />
        </div>
        <!-- Inhabitant/Guest rows: show ticket -->
        <div v-else-if="row.original.rowType === 'inhabitant' || row.original.rowType === 'guest-order'" class="hidden md:block">
          <DinnerTicket
            :ticket-config="row.original.ticketConfig"
            :price="row.original.price"
            :dinner-mode="row.original.dinnerMode"
            :is-released="isOrderReleased(row.original.orderState)"
            :is-claimed="isTicketClaimed(row.original)"
            :guest-count="row.original.guestCount"
            :ticket-count="row.original.ticketCount"
            :allergies="row.original.provenanceAllergies"
            :provenance-household="row.original.provenanceHousehold"
          />
        </div>
      </template>

      <!-- Expanded Row -->
      <template #expanded="{row}">
        <UCard
          :color="row.original.rowType === 'power' ? COMPONENTS.powerMode.card.color : (row.original.rowType === 'guest' ? 'info' : 'primary')"
          :variant="COMPONENTS.powerMode.card.variant"
          class="max-w-full overflow-x-auto"
          :ui="{body: 'p-4 flex flex-col gap-4', footer: 'p-4', header: 'p-4'}"
        >
          <template #header>
            <h4 class="text-md font-semibold text-balance">
              <template v-if="row.original.rowType === 'power'">
                Vælg for hele familien
              </template>
              <template v-else-if="row.original.rowType === 'guest'">
                Tilføj gæst til middagen
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
            :icon="COMPONENTS.powerMode.alert.icon"
            :color="COMPONENTS.powerMode.alert.color"
            :variant="COMPONENTS.powerMode.alert.variant"
            title="Du er ved at aktivere power mode"
            :description="`Ændringer påvirker alle ${household?.inhabitants?.length ?? 0} medlemmer.`"
          />

          <!-- Guest booking fields -->
          <GuestBookingFields
            v-if="row.original.rowType === 'guest'"
            v-model:ticket-price-id="guestDraft.ticketPriceId"
            v-model:allergies="guestDraft.allergies"
            v-model:guest-count="guestDraft.count"
            :ticket-prices="ticketPrices"
            :allergy-options="allergyOptions"
          />

          <!-- Provenance allergies (read-only for existing guest) -->
          <div v-if="row.original.rowType === 'guest-order' && row.original.provenanceAllergies?.length" class="flex flex-wrap gap-2">
            <UBadge v-for="allergy in row.original.provenanceAllergies" :key="allergy" :color="COLOR.warning" variant="soft">
              🥜 {{ allergy }}
            </UBadge>
          </div>

          <!-- Mode selector -->
          <DinnerModeSelector
            v-model="draftMode"
            :form-mode="FORM_MODES.EDIT"
            :disabled-modes="row.original.rowType === 'guest' ? guestDisabledModes : disabledModes"
            :consensus="row.original.consensus"
            :size="SIZES.standard"
            :name="`${row.original.rowType}-${row.original.id}-mode-edit`"
            orientation="horizontal"
            show-label
          />

          <template #footer>
            <div class="flex justify-start md:justify-end gap-2">
              <UButton
                :color="COLOR.neutral"
                variant="ghost"
                :icon="ICONS.xMark"
                :size="getIsMd ? 'md' : 'sm'"
                :data-testid="`${row.original.rowType}-${row.original.id}-cancel`"
                @click="handleCancel"
              >
                Annuller
              </UButton>
              <UButton
                :color="row.original.rowType === 'power' ? COMPONENTS.powerMode.color : (row.original.rowType === 'guest' ? 'info' : COLOR.primary)"
                variant="solid"
                :size="getIsMd ? 'md' : 'sm'"
                :loading="isSaving"
                :data-testid="`${row.original.rowType}-${row.original.id}-save`"
                @click="handleSave(row.original)"
              >
                <template #leading>
                  <UIcon :name="row.original.rowType === 'power' ? COMPONENTS.powerMode.buttonIcon : (row.original.rowType === 'guest' ? ICONS.userPlus : ICONS.check)" />
                </template>
                {{ row.original.rowType === 'power' ? 'Gem for alle' : (row.original.rowType === 'guest' ? 'Tilføj gæst' : 'Gem') }}
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UTable>

    <!-- Legend: DinnerModeSelector in VIEW mode with labels (DRY) -->
    <UAlert
      v-if="isEditModeAllowed"
      :icon="ICONS.info"
      :color="COLOR.neutral"
      variant="subtle"
      title="Forklaring"
      class="mt-4"
    >
      <template #description>
        <div class="flex flex-wrap gap-x-6 gap-y-2">
          <DinnerModeSelector :model-value="DinnerModeEnum.DINEIN" :form-mode="FORM_MODES.VIEW" show-label :size="SIZES.xs" />
          <DinnerModeSelector :model-value="DinnerModeEnum.DINEINLATE" :form-mode="FORM_MODES.VIEW" show-label :size="SIZES.xs" />
          <DinnerModeSelector :model-value="DinnerModeEnum.TAKEAWAY" :form-mode="FORM_MODES.VIEW" show-label :size="SIZES.xs" />
          <DinnerModeSelector :model-value="DinnerModeEnum.NONE" :form-mode="FORM_MODES.VIEW" show-label :size="SIZES.xs" />
          <DinnerModeSelector :model-value="DinnerModeEnum.DINEIN" :form-mode="FORM_MODES.VIEW" show-label :size="SIZES.xs" :consensus="false" />
        </div>
      </template>
    </UAlert>
  </div>
</template>
