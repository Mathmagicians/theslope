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
import type {DinnerEventDisplay, OrderDisplay, DinnerMode, OrderState} from '~/composables/useBookingValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import type {SeasonDeadlines} from '~/composables/useSeason'
import {FORM_MODES} from '~/types/form'

// Row types for synthetic rows in table
type RowType = 'inhabitant' | 'power' | 'guest' | 'guest-order'

// Ticket config type - use NuxtUIColor from design system
import type {NuxtUIColor} from '~/composables/useTheSlopeDesignSystem'
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
  orderState: OrderState | undefined
  dinnerMode: DinnerMode
  consensus?: boolean // Power mode: true=all agree, false=mixed
  price: number
  ticketPriceId: number
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

type BookingInhabitant = { id: number; name: string; birthDate: Date | null }

const emit = defineEmits<{
  updateBooking: [inhabitant: BookingInhabitant, dinnerMode: DinnerMode, isGuestTicket: boolean]
  updateAllBookings: [inhabitants: BookingInhabitant[], dinnerMode: DinnerMode]
  addGuest: [dinnerMode: DinnerMode, allergies: number[]]
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
const draftGuestTicketPriceId = ref<number | undefined>(undefined)
const draftGuestAllergies = ref<number[]>([])
const editingRowId = ref<number | string | null>(null)
const isSaving = ref(false)

// Expandable row with callbacks
const {expanded} = useExpandableRow({
  onExpand: (rowIndex) => {
    const row = tableData.value[rowIndex]
    if (row) {
      editingRowId.value = row.id
      draftMode.value = row.dinnerMode
      if (row.rowType === 'guest') {
        draftGuestAllergies.value = []
      }
    }
  },
  onCollapse: () => {
    editingRowId.value = null
    draftGuestAllergies.value = []
  }
})

// Initialize guest ticket price when ticket prices available
watch(() => props.ticketPrices, (prices) => {
  if (prices.length > 0 && !draftGuestTicketPriceId.value) {
    // Default to adult ticket
    const adultPrice = prices.find(p => p.ticketType === 'ADULT')
    draftGuestTicketPriceId.value = adultPrice?.id ?? prices[0]?.id ?? undefined
  }
}, {immediate: true})

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

const releasedTicketsFromOthers = computed(() => {
  if (canBook.value) return []
  return (props.allOrders ?? []).filter(o =>
    o.state === OrderStateEnum.RELEASED &&
    !householdInhabitantIds.value.has(o.inhabitantId)
  )
})

const userReleasedTickets = computed(() => {
  if (canBook.value) return []
  return (props.orders ?? []).filter(o => o.state === OrderStateEnum.RELEASED)
})

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
    const order = regularOrders.value.find(o => o.inhabitantId === inhabitant.id)
    const ticketConfig = getTicketTypeConfig(inhabitant.birthDate ?? null, props.ticketPrices)
    const ticketPrice = getTicketPriceForInhabitant(inhabitant.birthDate ?? null, props.ticketPrices)

    return {
      rowType: 'inhabitant' as RowType,
      id: inhabitant.id,
      name: inhabitant.name,
      lastName: inhabitant.lastName,
      birthDate: inhabitant.birthDate,
      inhabitant,
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

  const guestOrderRows: TableRow[] = guestOrders.value.map(order => ({
    rowType: 'guest-order' as RowType,
    id: `guest-${order.id}`,
    name: 'Gæst',
    lastName: '',
    inhabitant: bookerInhabitant.value ?? undefined,
    ticketConfig: order.ticketType ? ticketTypeConfig[order.ticketType] : null,
    order,
    orderState: order.state as OrderState,
    dinnerMode: order.dinnerMode,
    price: order.priceAtBooking,
    ticketPriceId: order.ticketPriceId ?? 0,
    provenanceHousehold: order.provenanceHousehold,
    provenanceAllergies: order.provenanceAllergies
  }))

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
    if (row.rowType === 'power') {
      // Power mode: update all inhabitants
      const inhabitants = (household.value?.inhabitants ?? []).map(i => ({
        id: i.id,
        name: i.name,
        birthDate: i.birthDate ?? null
      }))
      emit('updateAllBookings', inhabitants, draftMode.value)
    } else if (row.rowType === 'guest') {
      // Add new guest
      emit('addGuest', draftMode.value, draftGuestAllergies.value)
    } else if (row.rowType === 'guest-order') {
      // Update existing guest
      const inhabitantId = row.order?.inhabitantId
      if (inhabitantId) {
        emit('updateBooking', {id: inhabitantId, name: row.name, birthDate: null}, draftMode.value, true)
      }
    } else {
      // Update inhabitant
      if (typeof row.id === 'number') {
        emit('updateBooking', {id: row.id, name: row.name, birthDate: row.birthDate ?? null}, draftMode.value, false)
      }
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

// Guest ticket type options for dropdown
const guestTicketOptions = computed(() =>
  props.ticketPrices
    .filter(p => p.ticketType !== 'BABY') // Guests are typically adults/children
    .map(p => ({
      label: `${ticketTypeConfig[p.ticketType]?.label ?? p.ticketType} (${p.price / 100} kr)`,
      value: p.id
    }))
)

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
              :is-guest="row.original.rowType === 'guest-order'"
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
            :is-guest="row.original.rowType === 'guest-order'"
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

          <!-- Guest ticket type selector -->
          <UFormField v-if="row.original.rowType === 'guest'" label="Billettype" :size="SIZES.small">
            <USelect
              v-model="draftGuestTicketPriceId"
              :items="guestTicketOptions"
              value-key="value"
              :size="SIZES.small"
              name="guest-ticket-type"
            />
          </UFormField>

          <!-- Provenance allergies (read-only for existing guest) -->
          <div v-if="row.original.rowType === 'guest-order' && row.original.provenanceAllergies?.length" class="flex flex-wrap gap-2">
            <UBadge v-for="allergy in row.original.provenanceAllergies" :key="allergy" :color="COLOR.warning" variant="soft">
              🥜 {{ allergy }}
            </UBadge>
          </div>

          <!-- Guest allergy selector -->
          <UFormField v-if="row.original.rowType === 'guest'" label="Allergier (valgfrit)" :size="SIZES.small">
            <USelectMenu
              v-model="draftGuestAllergies"
              :items="allergyOptions"
              value-key="value"
              multiple
              placeholder="Vælg allergier..."
              :size="SIZES.small"
              name="guest-allergies"
            />
          </UFormField>

          <!-- Mode selector -->
          <DinnerModeSelector
            v-model="draftMode"
            :form-mode="FORM_MODES.EDIT"
            :disabled-modes="row.original.rowType === 'guest' ? guestDisabledModes : disabledModes"
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
  </div>
</template>
