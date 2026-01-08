<script setup lang="ts">
/**
 * DinnerBookingForm - Reusable booking form for a single dinner event
 *
 * Used in:
 * - ChefMenuCard: Single event booking on dinner page
 * - HouseholdBookings: Multiple events on household calendar page
 *
 * Features:
 * - Ticket card with 🎟️ background watermark for each inhabitant
 * - Left accent line indicates state: none (normal), blue (claimed), red (released)
 * - Name column: name + explanatory text (provenance, allergies, release warning)
 * - Ticket card row 1: Type (Voksen/Barn)
 * - Ticket card row 2: [State] Price | Mode (right-aligned for scanning)
 * - Responsive: stacked (mobile), side-by-side (desktop)
 *
 * DESKTOP - VIEW MODE:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ Anna Larsen                     ╭─────────────────────────────────────╮  │
 * │                                 │         ░░🎟️░░                     │  │
 * │                                 │         Voksen                      │  │
 * │                                 │      55 kr           🍽️ Spiser     │  │
 * │                                 ╰─────────────────────────────────────╯  │
 * ├──────────────────────────────────────────────────────────────────────────┤
 * │ Bob Larsen                      ┃─────────────────────────────────────╮  │
 * │ fra AR_1 • 🥜 Gluten            ┃         ░░🎟️░░                     │  │ <- BLUE (claimed)
 * │                                 ┃         Voksen                      │  │
 * │                                 ┃      55 kr           🛍️ Takeaway   │  │
 * │                                 ╰─────────────────────────────────────╯  │
 * ├──────────────────────────────────────────────────────────────────────────┤
 * │ Clara Larsen                    ┃─────────────────────────────────────╮  │
 * │ FRIGIVET                        ┃         ░░🎟️░░                     │  │ <- RED (released)
 * │                                 ┃         Barn                        │  │
 * │                                 ┃ 📤    35 kr           ❌ Ingen     │  │
 * │                                 ╰─────────────────────────────────────╯  │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * DESKTOP - EDIT MODE:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ Anna Larsen                     ╭─────────────────────────────────────╮  │
 * │                                 │         ░░🎟️░░                     │  │
 * │                                 │         Voksen                      │  │
 * │                                 │      55 kr      [🍽️][🕐][🛍️][❌]   │  │
 * │                                 ╰─────────────────────────────────────╯  │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * MOBILE - VIEW MODE (stacked):
 * ┌─────────────────────────────────┐
 * │ Anna Larsen                     │
 * │ ╭─────────────────────────────╮ │
 * │ │         ░░🎟️░░             │ │
 * │ │         Voksen              │ │
 * │ │   55 kr        🍽️ Spiser   │ │
 * │ ╰─────────────────────────────╯ │
 * ├─────────────────────────────────┤
 * │ Clara Larsen                    │
 * │ FRIGIVET                        │
 * │ ┃─────────────────────────────╮ │
 * │ ┃         ░░🎟️░░             │ │ <- RED (released)
 * │ ┃         Barn                │ │
 * │ ┃ 📤  35 kr       ❌ Ingen   │ │
 * │ ╰─────────────────────────────╯ │
 * └─────────────────────────────────┘
 *
 * Left accent line colors:
 * - Normal: no accent
 * - Claimed: blue (border-l-4 border-info)
 * - Released: red (border-l-4 border-error)
 *
 * Deadline States:
 * - Before booking deadline: Normal booking, ❌ = cancel (delete order)
 * - After booking deadline: ❌ = release (keep order, mark RELEASED, still pay)
 * - After dining mode deadline: Mode selectors disabled, ❌ still works
 */
import type {HouseholdDetail} from '~/composables/useCoreValidation'
import type {DinnerEventDisplay, OrderDisplay, DinnerMode, OrderState} from '~/composables/useBookingValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import type {SeasonDeadlines} from '~/composables/useSeason'
import {FORM_MODES, type FormMode} from '~/types/form'

// Row types for synthetic rows in table
type RowType = 'inhabitant' | 'power' | 'guest' | 'guest-order'

interface TableRow {
  rowType: RowType
  id: number | string
  name: string
  lastName: string
  birthDate?: Date | null
  ticketConfig: ReturnType<ReturnType<typeof useTicket>['getTicketTypeConfig']> | null
  order: OrderDisplay | null
  orderState: OrderState | undefined
  dinnerMode: DinnerMode
  price: number
  ticketPriceId: number
  // Provenance for claimed tickets (from USER_CLAIMED history)
  provenanceHousehold?: string
  provenanceAllergies?: string[]
}

interface Props {
  household?: HouseholdDetail  // Optional - fetched if not provided
  dinnerEvent: DinnerEventDisplay
  orders?: OrderDisplay[]  // Household's orders
  allOrders?: OrderDisplay[]  // All orders for dinner (to find released tickets from others)
  ticketPrices?: TicketPrice[]
  deadlines: SeasonDeadlines  // Season-configured deadline functions
  formMode?: FormMode
}

const props = withDefaults(defineProps<Props>(), {
  household: undefined,
  orders: () => [],
  allOrders: () => [],
  ticketPrices: () => [],
  formMode: FORM_MODES.VIEW
})

// Inhabitant data needed for processBooking (matches Pick<InhabitantDisplay, 'id' | 'name' | 'birthDate'>)
type BookingInhabitant = { id: number; name: string; birthDate: Date | null }

const emit = defineEmits<{
  updateBooking: [inhabitant: BookingInhabitant, dinnerMode: DinnerMode, isGuestTicket: boolean]
  updateAllBookings: [inhabitants: BookingInhabitant[], dinnerMode: DinnerMode]
  addGuest: [dinnerMode: DinnerMode]
}>()

// Helper to build emit payload for inhabitant rows (id is number for inhabitant rowType)
const emitInhabitantBooking = (row: TableRow, mode: DinnerMode) => {
  if (typeof row.id !== 'number') return
  emit('updateBooking', { id: row.id, name: row.name, birthDate: row.birthDate ?? null }, mode, false)
}

// Helper for guest-order rows (inhabitantId comes from order)
const emitGuestBooking = (row: TableRow, mode: DinnerMode) => {
  const inhabitantId = row.order?.inhabitantId
  if (!inhabitantId) return
  emit('updateBooking', { id: inhabitantId, name: row.name, birthDate: null }, mode, true)
}

// Self-initialize household store for auxiliary data
const householdsStore = useHouseholdsStore()
const {selectedHousehold} = storeToRefs(householdsStore)
householdsStore.initHouseholdsStore()

// Use prop if provided, otherwise use store (auto-selects user's household)
const household = computed(() => props.household ?? selectedHousehold.value)

// Design system
const { COMPONENTS, SIZES, COLOR, TYPOGRAPHY, ICONS, getRandomEmptyMessage } = useTheSlopeDesignSystem()

// Ticket business logic
const {getTicketTypeConfig, getTicketPriceForInhabitant} = useTicket()

// Season business logic for deadline checks (deadlines from prop, isDinnerPast from composable)
const {isDinnerPast} = useSeason()
const {canModifyOrders, canEditDiningMode} = props.deadlines

// Validation
const {DinnerModeSchema, OrderStateSchema} = useBookingValidation()
const DinnerModeEnum = DinnerModeSchema.enum
const OrderStateEnum = OrderStateSchema.enum

// Power mode and guest mode draft states
const draftPowerMode = ref<DinnerMode>(DinnerModeEnum.DINEIN)
const draftGuestMode = ref<DinnerMode>(DinnerModeEnum.DINEIN)

// Random fun empty state message from design system
const emptyStateMessage = getRandomEmptyMessage('household')

// ============================================================================
// DEADLINE COMPUTEDS
// ============================================================================

const canBook = computed(() => canModifyOrders(props.dinnerEvent.date))
const canChangeDiningMode = computed(() => canEditDiningMode(props.dinnerEvent.date))
const dinnerHasPassed = computed(() => isDinnerPast(props.dinnerEvent.date))

// Edit mode only allowed for future dinners (before dinner starts)
const isEditModeAllowed = computed(() => props.formMode === FORM_MODES.EDIT && !dinnerHasPassed.value)

// ============================================================================
// RELEASED TICKETS COMPUTEDS (only exist after booking deadline)
// ============================================================================

const householdInhabitantIds = computed(() =>
  new Set(household.value?.inhabitants?.map(i => i.id) ?? [])
)

// Released tickets from OTHER households (available to grab)
const releasedTicketsFromOthers = computed(() => {
  if (canBook.value) return []  // No released tickets before deadline
  return (props.allOrders ?? []).filter(o =>
    o.state === OrderStateEnum.RELEASED &&
    !householdInhabitantIds.value.has(o.inhabitantId)
  )
})

// User's own released tickets (they still pay - show warning!)
const userReleasedTickets = computed(() => {
  if (canBook.value) return []  // No released tickets before deadline
  return (props.orders ?? []).filter(o => o.state === OrderStateEnum.RELEASED)
})

const releasedTicketCount = computed(() => releasedTicketsFromOthers.value.length)
const hasReleasedTickets = computed(() => releasedTicketCount.value > 0)

// Partition orders into guest vs regular (single pass)
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

const columns = [
  {id: 'name', header: 'Billetter'},
  {id: 'mode', header: 'Detaljer', class: 'hidden md:table-cell'}
]

// Disabled modes based on deadline state
const disabledModes = computed(() =>
  canChangeDiningMode.value ? [] : [DinnerModeEnum.DINEIN, DinnerModeEnum.DINEINLATE, DinnerModeEnum.TAKEAWAY]
)

// Guest can't select NONE (must eat if adding)
const guestDisabledModes = computed(() =>
  canChangeDiningMode.value ? [DinnerModeEnum.NONE] : [DinnerModeEnum.DINEIN, DinnerModeEnum.DINEINLATE, DinnerModeEnum.TAKEAWAY, DinnerModeEnum.NONE]
)

const tableData = computed((): TableRow[] => {
  if (!household.value?.inhabitants) return []

  // Build inhabitant rows (using regularOrders - excludes guest tickets)
  const inhabitantRows: TableRow[] = household.value.inhabitants.map(inhabitant => {
    const order = regularOrders.value.find(o => o.inhabitantId === inhabitant.id)
    const ticketConfig = getTicketTypeConfig(inhabitant.birthDate ?? null, props.ticketPrices)
    const ticketPrice = getTicketPriceForInhabitant(inhabitant.birthDate ?? null, props.ticketPrices)

    return {
      rowType: 'inhabitant' as RowType,
      id: inhabitant.id,
      name: inhabitant.name,
      lastName: inhabitant.lastName,
      birthDate: inhabitant.birthDate,
      ticketConfig,
      order: order ?? null,
      orderState: order?.state as OrderState | undefined,
      dinnerMode: order?.dinnerMode ?? DinnerModeEnum.NONE,
      price: order?.priceAtBooking ?? ticketPrice?.price ?? 0,
      ticketPriceId: order?.ticketPriceId ?? ticketPrice?.id ?? 0,
      provenanceHousehold: order?.provenanceHousehold,
      provenanceAllergies: order?.provenanceAllergies
    }
  })

  // VIEW mode: inhabitants only
  if (!isEditModeAllowed.value) return inhabitantRows

  // EDIT mode: power mode + inhabitants + guest
  const defaultSyntheticRow = {
    lastName: '',
    ticketConfig: null,
    order: null,
    orderState: undefined as OrderState | undefined,
    price: 0,
    ticketPriceId: 0
  }

  return [
    { ...defaultSyntheticRow, rowType: 'power' as RowType, id: 'power-mode', name: '⚡ Hele familien', dinnerMode: draftPowerMode.value },
    ...inhabitantRows,
    { ...defaultSyntheticRow, rowType: 'guest' as RowType, id: 'add-guest', name: '👤 Tilføj gæst', dinnerMode: draftGuestMode.value }
  ]
})

// Guest order rows for GÆSTER section - use order's captured values
const {ticketTypeConfig} = useTicket()
const guestTableData = computed((): TableRow[] => {
  const bookerName = household.value?.inhabitants?.find(i => i.userId !== null)?.name ?? 'ukendt'

  return guestOrders.value.map(order => ({
    rowType: 'guest-order' as RowType,
    id: `guest-${order.id}`,
    name: `Gæst (inviteret af ${bookerName})`,
    lastName: '',
    ticketConfig: order.ticketType ? ticketTypeConfig[order.ticketType] : null,
    order,
    orderState: order.state as OrderState,
    dinnerMode: order.dinnerMode,
    price: order.priceAtBooking,
    ticketPriceId: order.ticketPriceId ?? 0,
    provenanceHousehold: order.provenanceHousehold,
    provenanceAllergies: order.provenanceAllergies
  }))
})

// ============================================================================
// HANDLERS
// ============================================================================

const handlePowerModeUpdate = () => {
  const inhabitants = (household.value?.inhabitants ?? []).map(i => ({
    id: i.id,
    name: i.name,
    birthDate: i.birthDate ?? null
  }))
  emit('updateAllBookings', inhabitants, draftPowerMode.value)
}
const handleAddGuest = () => emit('addGuest', draftGuestMode.value)
const isOrderReleased = (orderState: OrderState | undefined): boolean => orderState === OrderStateEnum.RELEASED

// ============================================================================
// HELPER TEXT
// ============================================================================

const powerModeHelperText = computed(() => {
  if (!canChangeDiningMode.value) return 'Kun frigiv muligt'
  if (!canBook.value) return '❌ frigiver billetter'
  return ''
})

const guestHelperText = computed(() => hasReleasedTickets.value ? `🎟️ ${releasedTicketCount.value} ledige` : '')

// Deadline labels from centralized composable (DRY)
const {DEADLINE_LABELS} = useBooking()

// Deadline status badges with explanation text
// Note: canBook/canChangeDiningMode return TRUE when BEFORE deadline (open), FALSE when AFTER (closed)
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

// ============================================================================
// TICKET CARD HELPERS
// ============================================================================

// Check if ticket is claimed (has provenance from another household)
const isTicketClaimed = (row: TableRow): boolean => !!row.provenanceHousehold
</script>

<template>
  <!-- Empty state: No household or no inhabitants -->
  <UAlert
    v-if="!household?.inhabitants?.length"
    :color="COLOR.neutral"
    variant="soft"
    :avatar="{ text: emptyStateMessage.emoji, size: SIZES.emptyStateAvatar }"
    :ui="COMPONENTS.emptyStateAlert"
  >
    <template #title>{{ emptyStateMessage.text }}</template>
    <template #description>Ingen husstandsmedlemmer fundet</template>
  </UAlert>

  <!-- Booking form with inhabitants -->
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

    <!-- Released Ticket Warnings (only after booking deadline) -->
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
        <template #description>
          Du betaler, medmindre andre køber
        </template>
      </UAlert>
      <UAlert
        v-if="hasReleasedTickets"
        color="info"
        variant="soft"
        icon="i-heroicons-ticket"
      >
        <template #title>🎟️ {{ releasedTicketCount }} ledig{{ releasedTicketCount === 1 ? ' billet' : 'e billetter' }}</template>
      </UAlert>
    </div>

    <!-- Inhabitants Table with Synthetic Rows -->
    <UTable :data="tableData" :columns="columns" :row-key="(row: TableRow) => String(row.id)">
      <!-- Name Column -->
      <template #name-cell="{ row }">
        <!-- Power Mode Row -->
        <div v-if="row.original.rowType === 'power'" class="py-1">
          <div :class="[TYPOGRAPHY.bodyTextMedium, 'font-semibold']">{{ row.original.name }}</div>
          <div v-if="powerModeHelperText" :class="TYPOGRAPHY.bodyTextMuted">{{ powerModeHelperText }}</div>
        </div>

        <!-- Guest Row -->
        <div v-else-if="row.original.rowType === 'guest'" class="py-1">
          <div :class="TYPOGRAPHY.bodyTextMedium">{{ row.original.name }}</div>
          <div v-if="guestHelperText" :class="TYPOGRAPHY.bodyTextMuted">{{ guestHelperText }}</div>
        </div>

        <!-- Inhabitant Row -->
        <div v-else class="py-1">
          <div :class="TYPOGRAPHY.bodyTextMedium">
            {{ row.original.name }} {{ row.original.lastName }}
          </div>
          <!-- Released ticket badge -->
          <UBadge
            v-if="isOrderReleased(row.original.orderState)"
            :color="COLOR.error"
            variant="soft"
            :size="SIZES.small"
            :icon="ICONS.released"
            class="mt-0.5"
          >
            FRIGIVET
          </UBadge>
          <!-- Provenance badges for claimed tickets -->
          <div v-else-if="row.original.provenanceHousehold" class="flex flex-wrap items-center gap-1 mt-0.5">
            <UBadge :color="COLOR.info" variant="soft" size="sm" :icon="ICONS.ticket">
              fra {{ row.original.provenanceHousehold }}
            </UBadge>
            <UBadge
              v-if="row.original.provenanceAllergies?.length"
              :color="COLOR.warning"
              variant="soft"
              size="sm"
            >
              🥜 {{ row.original.provenanceAllergies.join(', ') }}
            </UBadge>
          </div>
          <!-- Mobile: Ticket card inline (hidden on desktop) -->
          <div class="mt-2 md:hidden">
            <DinnerTicket
              :ticket-config="row.original.ticketConfig"
              :price="row.original.price"
              :dinner-mode="row.original.dinnerMode"
              :is-released="isOrderReleased(row.original.orderState)"
              :is-claimed="isTicketClaimed(row.original)"
              :form-mode="isEditModeAllowed ? FORM_MODES.EDIT : FORM_MODES.VIEW"
              :disabled-modes="disabledModes"
              :selector-name="`${row.original.rowType}-${row.original.id}-mobile`"
              @update:dinner-mode="(mode: DinnerMode) => emitInhabitantBooking(row.original, mode)"
            />
          </div>
        </div>
      </template>

      <!-- Mode Column - Ticket Card Visual -->
      <template #mode-cell="{ row }">
        <!-- Power Mode Row (EDIT mode only) -->
        <div v-if="row.original.rowType === 'power'" class="flex items-center gap-2">
          <DinnerModeSelector
            v-model="draftPowerMode"
            :form-mode="FORM_MODES.EDIT"
            :disabled-modes="disabledModes"
            size="sm"
            name="power-mode-selector"
          />
          <UButton
            :color="COMPONENTS.powerMode.color"
            variant="solid"
            size="sm"
            name="save-power-mode"
            @click="handlePowerModeUpdate"
          >
            Gem
          </UButton>
        </div>

        <!-- Guest Row (EDIT mode only) -->
        <div v-else-if="row.original.rowType === 'guest'" class="flex items-center gap-2">
          <DinnerModeSelector
            v-model="draftGuestMode"
            :form-mode="FORM_MODES.EDIT"
            :disabled-modes="guestDisabledModes"
            size="sm"
            name="guest-mode-selector"
          />
          <UButton
            color="primary"
            variant="solid"
            size="sm"
            name="add-guest"
            @click="handleAddGuest"
          >
            Tilføj
          </UButton>
        </div>

        <!-- Desktop: Ticket Card for Inhabitants (hidden on mobile) -->
        <div v-else class="hidden md:block">
          <DinnerTicket
            :ticket-config="row.original.ticketConfig"
            :price="row.original.price"
            :dinner-mode="row.original.dinnerMode"
            :is-released="isOrderReleased(row.original.orderState)"
            :is-claimed="isTicketClaimed(row.original)"
            :form-mode="isEditModeAllowed ? FORM_MODES.EDIT : FORM_MODES.VIEW"
            :disabled-modes="disabledModes"
            :selector-name="`${row.original.rowType}-${row.original.id}`"
            @update:dinner-mode="(mode: DinnerMode) => emitInhabitantBooking(row.original, mode)"
          />
        </div>
      </template>
    </UTable>

    <!-- GÆSTER Section (guest tickets at bottom) -->
    <div v-if="guestTableData.length > 0" class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
      <h4 :class="[TYPOGRAPHY.bodyTextMedium, 'font-semibold mb-2']">GÆSTER</h4>
      <UTable :data="guestTableData" :columns="columns" :row-key="(row: TableRow) => String(row.id)">
        <!-- Name Column for Guest Orders -->
        <template #name-cell="{ row }">
          <div class="py-1">
            <div :class="TYPOGRAPHY.bodyTextMedium">{{ row.original.name }}</div>
            <!-- Provenance badges -->
            <div v-if="row.original.provenanceHousehold" class="flex flex-wrap items-center gap-1 mt-0.5">
              <UBadge :color="COLOR.info" variant="soft" size="sm" :icon="ICONS.ticket">
                fra {{ row.original.provenanceHousehold }}
              </UBadge>
              <UBadge
                v-if="row.original.provenanceAllergies?.length"
                :color="COLOR.warning"
                variant="soft"
                size="sm"
              >
                🥜 {{ row.original.provenanceAllergies.join(', ') }}
              </UBadge>
            </div>
            <!-- Mobile: Ticket card inline (hidden on desktop) -->
            <div class="mt-2 md:hidden">
              <DinnerTicket
                :ticket-config="row.original.ticketConfig"
                :price="row.original.price"
                :dinner-mode="row.original.dinnerMode"
                :is-released="isOrderReleased(row.original.orderState)"
                :is-claimed="isTicketClaimed(row.original)"
                :is-guest="true"
                :form-mode="isEditModeAllowed ? FORM_MODES.EDIT : FORM_MODES.VIEW"
                :disabled-modes="disabledModes"
                :selector-name="`guest-${row.original.id}-mobile`"
                @update:dinner-mode="(mode: DinnerMode) => emitGuestBooking(row.original, mode)"
              />
            </div>
          </div>
        </template>

        <!-- Mode Column - Desktop: Ticket Card for Guest Orders (hidden on mobile) -->
        <template #mode-cell="{ row }">
          <div class="hidden md:block">
            <DinnerTicket
              :ticket-config="row.original.ticketConfig"
              :price="row.original.price"
              :dinner-mode="row.original.dinnerMode"
              :is-released="isOrderReleased(row.original.orderState)"
              :is-claimed="isTicketClaimed(row.original)"
              :is-guest="true"
              :form-mode="isEditModeAllowed ? FORM_MODES.EDIT : FORM_MODES.VIEW"
              :disabled-modes="disabledModes"
              :selector-name="`guest-${row.original.id}`"
              @update:dinner-mode="(mode: DinnerMode) => emitGuestBooking(row.original, mode)"
            />
          </div>
        </template>
      </UTable>
    </div>
  </div>
</template>
