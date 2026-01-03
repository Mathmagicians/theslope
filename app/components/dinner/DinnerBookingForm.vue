<script setup lang="ts">
/**
 * DinnerBookingForm - Reusable booking form for a single dinner event
 *
 * Used in:
 * - ChefMenuCard: Single event booking on dinner page
 * - HouseholdBookings: Multiple events on household calendar page
 *
 * Features:
 * - UTable with household inhabitants + synthetic rows (power mode, guest)
 * - VIEW mode: Badges only, no synthetic rows, shows released ticket warnings
 * - EDIT mode: Full controls with power mode (first) and guest row (last)
 * - Deadline visibility: Shows booking/dining mode deadline status
 * - Released tickets: Only exist after booking deadline, warnings for own released
 * - Responsive: Horizontal selectors (desktop), vertical (mobile)
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
type RowType = 'inhabitant' | 'power' | 'guest'

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

const emit = defineEmits<{
  updateBooking: [inhabitantId: number, dinnerMode: DinnerMode, ticketPriceId: number]
  updateAllBookings: [dinnerMode: DinnerMode]
  addGuest: [dinnerMode: DinnerMode]
}>()

// Self-initialize household store for auxiliary data
const householdsStore = useHouseholdsStore()
const {selectedHousehold} = storeToRefs(householdsStore)
householdsStore.initHouseholdsStore()

// Use prop if provided, otherwise use store (auto-selects user's household)
const household = computed(() => props.household ?? selectedHousehold.value)

// Design system
const { COMPONENTS, SIZES, COLOR, TYPOGRAPHY, ICONS, getRandomEmptyMessage } = useTheSlopeDesignSystem()

// Ticket business logic
const {getTicketTypeConfig, getTicketPriceForInhabitant, formatPrice} = useTicket()

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

// ============================================================================
// TABLE CONFIGURATION
// ============================================================================

const columns = [
  {id: 'name', header: 'Hvem'},
  {id: 'mode', header: 'Hvordan spiser I'}
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

  // Build inhabitant rows
  const inhabitantRows: TableRow[] = household.value.inhabitants.map(inhabitant => {
    const order = props.orders?.find(o => o.inhabitantId === inhabitant.id && o.dinnerEventId === props.dinnerEvent.id)
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
      price: ticketPrice?.price ?? 0,
      ticketPriceId: ticketPrice?.id ?? 0
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

// ============================================================================
// HANDLERS
// ============================================================================

const handlePowerModeUpdate = () => emit('updateAllBookings', draftPowerMode.value)
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

// Deadline status badges
const deadlineStatusBadges = computed(() => [
  { label: 'Tilmelding', isOpen: canBook.value },
  { label: 'Hvordan spiser I', isOpen: canChangeDiningMode.value }
])
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
    <div class="flex flex-wrap gap-2 text-sm">
      <UBadge
        v-for="badge in deadlineStatusBadges"
        :key="badge.label"
        :color="badge.isOpen ? COLOR.success : COLOR.neutral"
        variant="soft"
        size="sm"
        :icon="badge.isOpen ? 'i-heroicons-lock-open' : 'i-heroicons-lock-closed'"
      >
        {{ badge.label }}: {{ badge.isOpen ? 'Åben' : 'Lukket' }}
      </UBadge>
    </div>

    <!-- Released Ticket Warnings (only after booking deadline) -->
    <div v-if="!canBook" class="space-y-2">
      <UAlert
        v-if="userReleasedTickets.length > 0"
        color="warning"
        variant="soft"
        icon="i-heroicons-exclamation-triangle"
      >
        <template #title>
          Du har {{ userReleasedTickets.length }} frigivet{{ userReleasedTickets.length === 1 ? ' billet' : ' billetter' }} - du betaler stadig!
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
          <div class="flex items-center gap-2">
            <span :class="TYPOGRAPHY.bodyTextMedium">{{ row.original.name }} {{ row.original.lastName }}</span>
            <UBadge
              v-if="row.original.ticketConfig"
              :color="row.original.ticketConfig.color"
              variant="subtle"
              size="sm"
            >
              {{ row.original.ticketConfig.label }}
            </UBadge>
          </div>
          <div v-if="isOrderReleased(row.original.orderState)" class="flex items-center gap-1 mt-0.5">
            <UBadge :color="COLOR.info" variant="soft" size="sm" :icon="ICONS.ticket">FRIGIVET</UBadge>
            <span :class="TYPOGRAPHY.bodyTextMuted">(du betaler stadig)</span>
          </div>
        </div>
      </template>

      <!-- Mode Column -->
      <template #mode-cell="{ row }">
        <!-- VIEW mode: Badge only -->
        <template v-if="!isEditModeAllowed">
          <UBadge v-if="isOrderReleased(row.original.orderState)" :color="COLOR.info" variant="soft" size="sm" :icon="ICONS.ticket">
            FRIGIVET
          </UBadge>
          <DinnerModeSelector
            v-else
            :model-value="row.original.dinnerMode"
            :form-mode="FORM_MODES.VIEW"
            size="sm"
            :name="`${row.original.rowType}-${row.original.id}-mode-view`"
          />
        </template>

        <!-- EDIT mode -->
        <template v-else>
          <!-- Power Mode Row -->
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

          <!-- Guest Row -->
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

          <!-- Inhabitant Row (normal or released - both can change mode) -->
          <div v-else class="flex items-center gap-2 md:gap-4">
            <DinnerModeSelector
              :model-value="row.original.dinnerMode"
              :form-mode="FORM_MODES.EDIT"
              :disabled-modes="disabledModes"
              size="sm"
              :name="`inhabitant-${row.original.id}-mode-edit`"
              @update:model-value="(mode: DinnerMode) => emit('updateBooking', row.original.id as number, mode, row.original.ticketPriceId)"
            />
            <span :class="[TYPOGRAPHY.bodyTextMedium, 'whitespace-nowrap']">{{ formatPrice(row.original.price) }} kr</span>
          </div>
        </template>
      </template>
    </UTable>
  </div>
</template>
