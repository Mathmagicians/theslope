<script setup lang="ts">
/**
 * AdminEconomy - Admin billing overview (Økonomi tab)
 *
 * Two sections:
 * - Fremtidige bestillinger: future orders grouped by dinner (all households)
 * - Faktureringsperioder: unified table with virtual (🟢) + closed (✓) periods
 *
 * Uses EconomyTable for date-based filtering, CostEntry/CostLine for grouped items.
 * Data: Uses bookings store (ADR-007) with lazy loading for details.
 */
import {formatDate, formatDateRange} from '~/utils/date'
import type {DateRange} from '~/types/dateTypes'
import type {TransactionDisplay, CostEntry} from '~/composables/useBillingValidation'
import type {OrderDisplay, DesiredOrder, DinnerEventDisplay} from '~/composables/useBookingValidation'
import type {StatBox} from '~/components/economy/CostEntry.vue'
import type {SeasonDeadlines} from '~/composables/useSeason'
import type {HouseholdDetail} from '~/composables/useCoreValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'

// Props - canEdit from parent for authorization
const props = withDefaults(defineProps<{
  canEdit?: boolean
}>(), {
  canEdit: false
})

const {formatPrice} = useTicket()
const {groupByCostEntry, groupByHouseholdEntry, joinOrdersWithDinnerEvents, calculateCurrentBillingPeriod, controlInvoices, formatTicketCounts} = useBilling()
const {splitDinnerEvents} = useSeason()
const {ICONS, SIZES, TYPOGRAPHY, COMPONENTS} = useTheSlopeDesignSystem()
const {OrderDisplaySchema} = useBookingValidation()

// Plan store for future dinners
const planStore = usePlanStore()
const {selectedSeason} = storeToRefs(planStore)
planStore.initPlanStore()

// Households store for inhabitant name lookup and admin correction
const householdsStore = useHouseholdsStore()
const {households} = storeToRefs(householdsStore)
householdsStore.initHouseholdsStore()

// Derive all inhabitants from all households
const allInhabitants = computed(() =>
    households.value.flatMap(h => h.inhabitants)
)

// Bookings store for billing data (ADR-007)
const bookingsStore = useBookingsStore()
const {
    billingPeriods,
    billingPeriodsError,
    isBillingPeriodsLoading,
    isBillingPeriodsErrored,
    selectedBillingPeriodDetail,
    isBillingPeriodDetailLoading,
    currentPeriodTransactions,
    isCurrentPeriodLoading,
    selectedInvoiceTransactions,
    isInvoiceTransactionsLoading
} = storeToRefs(bookingsStore)
const {loadBillingPeriodDetail, loadInvoiceTransactions} = bookingsStore

// ========== SECTION 1: FREMTIDIGE BESTILLINGER ==========

// Dinner events lookup for joining orders
const dinnerEvents = computed(() => selectedSeason.value?.dinnerEvents ?? [])
const dinnerEventsMap = computed(() =>
    new Map(dinnerEvents.value.map(e => [e.id, {id: e.id, date: e.date, menuTitle: e.menuTitle}]))
)

// Upcoming dinner IDs = nextDinner + future (using splitDinnerEvents)
const splitResult = computed(() => splitDinnerEvents(dinnerEvents.value))
const upcomingDinnerIds = computed(() => {
    const {nextDinner, futureDinners} = splitResult.value
    return [
        ...(nextDinner ? [nextDinner.id] : []),
        ...futureDinners.map(e => e.id)
    ]
})

// Inhabitant name lookup
const inhabitantsMap = computed(() => new Map(allInhabitants.value.map(i => [i.id, i.name])))
const getInhabitantName = (id: number) => inhabitantsMap.value.get(id) ?? `#${id}`

// Household lookup for future orders grouping
const householdsMap = computed(() =>
    new Map(households.value.map(h => [h.id, {id: h.id, pbsId: h.pbsId, address: h.address}]))
)
// Inhabitant -> household lookup
const inhabitantHouseholdMap = computed(() =>
    new Map(allInhabitants.value.map(i => [i.id, i.householdId]))
)
const getHouseholdForInhabitant = (inhabitantId: number) => {
    const householdId = inhabitantHouseholdMap.value.get(inhabitantId)
    return householdId ? householdsMap.value.get(householdId) : undefined
}

// Fetch upcoming orders (admin: all households)
// CRITICAL: Use computed key for reactive refetch when season changes (ADR-007)
const upcomingOrdersKey = computed(() =>
    `admin-economy-upcoming-orders-${upcomingDinnerIds.value.join('-')}`
)
const {data: upcomingOrders, status: upcomingOrdersStatus, refresh: refreshUpcomingOrders} = useAsyncData<OrderDisplay[]>(
    upcomingOrdersKey,
    () => {
        if (upcomingDinnerIds.value.length === 0) return Promise.resolve([])
        const params = new URLSearchParams()
        upcomingDinnerIds.value.forEach(id => params.append('dinnerEventIds', String(id)))
        params.append('allHouseholds', 'true')
        return $fetch<OrderDisplay[]>(`/api/order?${params.toString()}`)
    },
    {
        default: () => [],
        transform: (data: unknown[]) => (data as Record<string, unknown>[]).map(o => OrderDisplaySchema.parse(o)),
        // Watch for changes to re-fetch when season loads (computed key alone doesn't trigger refetch)
        watch: [upcomingDinnerIds]
    }
)
// Loading state: only actual fetch status (table shows empty until season loads, then reactively updates)
const isUpcomingOrdersLoading = computed(() => upcomingOrdersStatus.value === 'pending')

// Future orders enriched with dinner + household info for grouping
type OrderWithDinnerAndHousehold = OrderDisplay & {
    dinnerEvent: {id: number, date: Date, menuTitle: string}
    inhabitant: {id: number, name: string, household: {id: number, pbsId: number, address: string}}
}
const upcomingOrdersWithDinnerAndHousehold = computed(() =>
    joinOrdersWithDinnerEvents(upcomingOrders.value, dinnerEventsMap.value, getInhabitantName)
        .map(o => ({
            ...o,
            inhabitant: {
                ...o.inhabitant,
                household: getHouseholdForInhabitant(o.inhabitantId) ?? {id: 0, pbsId: 0, address: 'Ukendt'}
            }
        })) as OrderWithDinnerAndHousehold[]
)
const groupOrdersByDinner = groupByCostEntry<OrderWithDinnerAndHousehold>(o => o.dinnerEvent)
const upcomingOrdersGrouped = computed(() =>
    groupOrdersByDinner(upcomingOrdersWithDinnerAndHousehold.value, o => o.priceAtBooking)
)

// Grouper for orders by household (within a dinner)
const groupOrdersByHousehold = groupByHouseholdEntry<OrderWithDinnerAndHousehold>(o => o.inhabitant.household)
const upcomingOrdersTotal = computed(() =>
    upcomingOrdersWithDinnerAndHousehold.value.reduce((sum, o) => sum + o.priceAtBooking, 0)
)

// Dinner columns for orders table
const dinnerColumns = [
    {id: 'expand'},
    {accessorKey: 'date', header: 'Dato'},
    {accessorKey: 'menuTitle', header: 'Menu'},
    {accessorKey: 'ticketCounts', header: 'Kuverter'},
    {accessorKey: 'totalAmount', header: 'Beløb'}
]

// Household columns for nested table within dinner expansion
// Address column shows "<address> · PBS xx" format
const householdOrderColumns = [
    {id: 'expand'},
    {accessorKey: 'address', header: 'Adresse'},
    {accessorKey: 'ticketCounts', header: 'Kuverter'},
    {accessorKey: 'totalAmount', header: 'Beløb'}
]

// Sort household entries by address (alphabetical)
const sortByAddress = <T extends { address: string }>(entries: T[]): T[] =>
    [...entries].sort((a, b) => a.address.localeCompare(b.address, 'da'))

// Per-dinner search state for household filtering
const householdSearchQueries = ref<Map<number, string>>(new Map())
const getHouseholdSearch = (dinnerEventId: number): string =>
    householdSearchQueries.value.get(dinnerEventId) ?? ''
const setHouseholdSearch = (dinnerEventId: number, query: string) => {
    householdSearchQueries.value.set(dinnerEventId, query)
}

// Filter households by address and inhabitant names
type HouseholdEntry = { address: string, pbsId: number, totalAmount: number, items: OrderWithDinnerAndHousehold[] }
const filterHouseholds = (entries: HouseholdEntry[], query: string): HouseholdEntry[] => {
    if (!query) return entries
    const q = query.toLowerCase()
    return entries.filter(entry =>
        entry.address.toLowerCase().includes(q) ||
        entry.items.some(order => order.inhabitant.name.toLowerCase().includes(q))
    )
}

// Stats accessor for future orders dinner expansion
const futureDinnerStatsAccessor = (entry: {items: OrderWithDinnerAndHousehold[], date: Date, menuTitle: string}): StatBox[] => {
    const households = new Set(entry.items.map(o => o.inhabitant.household.id))
    return [
        {icon: ICONS.household, value: households.size, label: 'Husstande'},
        {icon: ICONS.dinner, value: formatTicketCounts(entry.items), label: 'Kuverter'},
        {icon: ICONS.shoppingCart, value: `${formatPrice(entry.items.reduce((sum, o) => sum + o.priceAtBooking, 0))} kr`, label: 'Total'}
    ]
}

// ========== SECTION 2: FAKTURERINGSPERIODER (unified) ==========

// Current billing period dates
const currentPeriod = computed(() => calculateCurrentBillingPeriod())

// Curried grouper for transactions by dinner
const groupTxByDinner = groupByCostEntry<TransactionDisplay>(tx => tx.dinnerEvent)

// Curried grouper for transactions by household (for virtual invoices)
const groupTxByHousehold = groupByHouseholdEntry<TransactionDisplay>(tx => tx.inhabitant.household)

// Current period grouped by HOUSEHOLD first (virtual invoices - same structure as closed)
const currentPeriodByHousehold = computed(() =>
    groupTxByHousehold(currentPeriodTransactions.value, tx => tx.amount)
)

// Current period grouped by dinner (for expanded household view)
const currentPeriodGrouped = computed(() =>
    groupTxByDinner(currentPeriodTransactions.value, tx => tx.amount)
)

// Selected invoice transactions grouped by dinner
const invoiceTransactionsGrouped = computed(() =>
    groupTxByDinner(selectedInvoiceTransactions.value, tx => tx.amount)
)

// Current period total
const currentPeriodTotal = computed(() =>
    currentPeriodTransactions.value.reduce((sum, tx) => sum + tx.amount, 0)
)

// Count unique households in current period
const currentPeriodHouseholdCount = computed(() => {
    const householdIds = new Set(currentPeriodTransactions.value.map(tx => tx.inhabitant.household.id))
    return householdIds.size
})

// Unified billing periods: virtual (current) + closed (past)
interface UnifiedBillingPeriod {
    id: number | 'virtual'
    isVirtual: boolean
    period: DateRange           // Forbrugsperiode (proper DateRange, not string)
    cutoffDate: Date | null     // Opgørelsesdato (null for virtual)
    paymentDate: Date | null    // PBS opkræves (null for virtual)
    householdCount: number
    dinnerCount: number         // # unique dinner events
    ticketCounts: string        // "2V 1B" format
    totalAmount: number
    invoiceSum: number | null   // Σ invoice.amount for control sum (null for virtual)
    shareToken?: string
}

// Accessor functions for CostEntry (reusable lambdas)
// Level 1: Billing period summary - CLOSED periods
const billingPeriodTitleAccessor = () => 'Samlet PBS Afregning'
const billingPeriodSubtitleAccessor = (period: UnifiedBillingPeriod) => formatDateRange(period.period)
const billingPeriodStatsAccessor = (period: UnifiedBillingPeriod): StatBox[] => [
    {icon: ICONS.household, value: period.householdCount, label: 'Husstande'},
    {icon: ICONS.calendar, value: period.dinnerCount, label: 'Middage'},
    {icon: ICONS.dinner, value: period.ticketCounts, label: 'Kuverter'},
    {icon: ICONS.shoppingCart, value: `${formatPrice(period.totalAmount)} kr`, label: 'Total'}
]

// Level 1: Virtual period summary - "NÆSTE PBS"
const virtualPeriodTitleAccessor = () => 'Næste PBS'
const virtualPeriodSubtitleAccessor = (period: UnifiedBillingPeriod) => formatDateRange(period.period)
const virtualPeriodStatsAccessor = (period: UnifiedBillingPeriod): StatBox[] => [
    {icon: ICONS.household, value: period.householdCount, label: 'Husstande'},
    {icon: ICONS.calendar, value: period.dinnerCount, label: 'Middage'},
    {icon: ICONS.dinner, value: period.ticketCounts, label: 'Kuverter'},
    {icon: ICONS.shoppingCart, value: `${formatPrice(period.totalAmount)} kr`, label: 'Total'}
]

// Virtual invoice columns (same as closed invoice columns)
const virtualInvoiceColumns = [
    {id: 'expand'},
    {accessorKey: 'pbsId', header: 'PBS'},
    {accessorKey: 'address', header: 'Adresse'},
    {accessorKey: 'totalAmount', header: 'Beløb'},
    {accessorKey: 'control', header: 'Kontrol'}
]


const unifiedBillingPeriods = computed((): UnifiedBillingPeriod[] => {
    // Virtual row (current period) - use already-grouped data
    const virtualRow: UnifiedBillingPeriod = {
        id: 'virtual',
        isVirtual: true,
        period: currentPeriod.value,
        cutoffDate: null,
        paymentDate: null,
        householdCount: currentPeriodHouseholdCount.value,
        dinnerCount: currentPeriodGrouped.value.length,
        ticketCounts: formatTicketCounts(currentPeriodTransactions.value),
        totalAmount: currentPeriodTotal.value,
        invoiceSum: null  // No invoices for virtual (ongoing)
    }

    // Closed periods - parse DateRange from billingPeriod string "dd/MM/yyyy-dd/MM/yyyy"
    const closedRows: UnifiedBillingPeriod[] = billingPeriods.value.map(bp => {
        const parts = bp.billingPeriod.split('-')
        const startStr = parts[0] ?? ''
        const endStr = parts[1] ?? ''
        const parseDate = (s: string) => {
            const dateParts = s.split('/').map(Number)
            const day = dateParts[0] ?? 1
            const month = dateParts[1] ?? 1
            const year = dateParts[2] ?? 2000
            return new Date(year, month - 1, day)
        }
        return {
            id: bp.id,
            isVirtual: false,
            period: {start: parseDate(startStr), end: parseDate(endStr)},
            cutoffDate: bp.cutoffDate,
            paymentDate: bp.paymentDate,
            householdCount: bp.householdCount,
            dinnerCount: bp.dinnerCount,
            ticketCounts: formatTicketCounts(bp.ticketCountsByType),
            totalAmount: bp.totalAmount,
            invoiceSum: bp.invoiceSum,
            shareToken: bp.shareToken
        }
    })

    // Virtual first, then closed sorted by period start desc
    return [virtualRow, ...closedRows]
})


// Billing periods columns
const periodColumns = [
    {id: 'expand'},
    {accessorKey: 'status', header: 'Status'},
    {accessorKey: 'period', header: 'Periode'},
    {accessorKey: 'dinnerCount', header: 'Middage'},
    {accessorKey: 'ticketCounts', header: 'Kuverter'},
    {accessorKey: 'householdCount', header: 'Husstande'},
    {accessorKey: 'totalAmount', header: 'Omsætning'},
    {accessorKey: 'control', header: 'Kontrol'},
    {accessorKey: 'share', header: 'Del'}
]

// Invoice columns for nested UTable (with control sum)
const invoiceColumns = [
    {id: 'expand'},
    {accessorKey: 'pbsId', header: 'PBS'},
    {accessorKey: 'address', header: 'Adresse'},
    {accessorKey: 'amount', header: 'Beløb'},
    {accessorKey: 'control', header: 'Kontrol'}
]

// Nested table expansion state (for invoices)
const {expanded: expandedInvoiceRows} = useExpandableRow()

// Control sum for billing period (Σ invoices vs period total)
const billingPeriodControlSum = computed(() => {
    if (!selectedBillingPeriodDetail.value) return null
    return controlInvoices(selectedBillingPeriodDetail.value.invoices, selectedBillingPeriodDetail.value.totalAmount)
})

// Single history visible at a time
const historyOrderId = ref<number | null>(null)
const toggleHistory = (orderId: number | null) => {
    historyOrderId.value = historyOrderId.value === orderId ? null : orderId
}

// ========== ADMIN CORRECTION (edit orders bypassing deadlines) ==========

// Track which dinner is being edited + selected household
const editingDinnerId = ref<number | null>(null)
const editingHouseholdId = ref<number | null>(null)
const editingHousehold = ref<HouseholdDetail | null>(null)
const isLoadingHousehold = ref(false)

const startEditingDinner = (dinnerEventId: number) => {
    editingDinnerId.value = dinnerEventId
    editingHouseholdId.value = null
    editingHousehold.value = null
}
const cancelEditing = () => {
    editingDinnerId.value = null
    editingHouseholdId.value = null
    editingHousehold.value = null
}

// Household options for selector
type HouseholdOption = { label: string; value: number }
const householdOptions = computed((): HouseholdOption[] =>
    households.value.map(h => ({
        label: `${h.address} · PBS ${h.pbsId}`,
        value: h.id
    }))
)

// Selected household option (USelectMenu expects undefined not null for empty state)
const selectedHouseholdOption = computed({
    get: () => householdOptions.value.find(o => o.value === editingHouseholdId.value),
    set: async (option: HouseholdOption | undefined) => {
        editingHouseholdId.value = option?.value ?? null
        editingHousehold.value = null
        // Load full HouseholdDetail for DinnerBookingForm
        if (option?.value) {
            isLoadingHousehold.value = true
            try {
                editingHousehold.value = await householdsStore.fetchHouseholdDetail(option.value)
            } finally {
                isLoadingHousehold.value = false
            }
        }
    }
})

// Admin deadlines - bypass all checks (ADR-016: always-true predicates)
const adminDeadlines: SeasonDeadlines = {
    canModifyOrders: () => true,
    canEditDiningMode: () => true,
    getOrderCancellationAction: () => null,
    isAnnounceMenuPastDeadline: () => false
}

// Get data for DinnerBookingForm
const editingDinnerEvent = computed((): DinnerEventDisplay | null => {
    if (!editingDinnerId.value) return null
    return dinnerEvents.value.find(e => e.id === editingDinnerId.value) ?? null
})

const editingOrders = computed((): OrderDisplay[] => {
    if (!editingDinnerId.value || !editingHouseholdId.value) return []
    return upcomingOrders.value.filter(o =>
        o.dinnerEventId === editingDinnerId.value &&
        inhabitantHouseholdMap.value.get(o.inhabitantId) === editingHouseholdId.value
    )
})

const ticketPrices = computed((): TicketPrice[] =>
    selectedSeason.value?.ticketPrices ?? []
)

// Handle save from DinnerBookingForm
const toast = useToast()
const {formatScaffoldResult} = useBooking()
const {processAdminCorrection} = bookingsStore

const handleAdminSave = async (orders: DesiredOrder[]) => {
    if (!editingDinnerId.value || !editingHouseholdId.value || !editingDinnerEvent.value || !editingHousehold.value) return
    const result = await processAdminCorrection(
        editingHouseholdId.value,
        editingDinnerId.value,
        editingDinnerEvent.value.date,
        orders,
        editingOrders.value
    )
    await refreshUpcomingOrders()
    toast.add({
        title: 'Administrator Korrektion',
        description: `${editingHousehold.value.address}: ${formatScaffoldResult(result)}`,
        color: 'success'
    })
    cancelEditing()
}

// Dinner breakdown stats (for caption in expanded invoice view)
const dinnerBreakdownStats = computed(() => {
    const groups = invoiceTransactionsGrouped.value
    const allTx = groups.flatMap(g => g.items)
    return {
        dinnerCount: groups.length,
        ticketCounts: formatTicketCounts(allTx),
        total: groups.reduce((sum, g) => sum + g.totalAmount, 0)
    }
})

</script>

<template>
  <div data-testid="admin-economy" class="space-y-6">
    <ViewError v-if="isBillingPeriodsErrored" :error="billingPeriodsError?.statusCode" message="Kunne ikke hente økonomioversigt"/>

    <template v-else>
      <!-- SECTION 1: Fremtidige bestillinger -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon :name="ICONS.shoppingCart" :size="SIZES.standardIconSize"/>
            <h3 :class="TYPOGRAPHY.cardTitle">Fremtidige bestillinger</h3>
          </div>
        </template>

        <EconomyTable
            :data="upcomingOrdersGrouped"
            :columns="dinnerColumns"
            row-key="dinnerEventId"
            :date-accessor="(item) => item.date"
            :loading="isUpcomingOrdersLoading"
        >
          <template #expand-cell="{ row }">
            <UButton
                v-if="row.original.items.length > 0"
                color="neutral"
                variant="ghost"
                :icon="row.getIsExpanded() ? ICONS.chevronDown : ICONS.chevronRight"
                square
                :size="SIZES.small"
                aria-label="Vis detaljer"
                @click="row.toggleExpanded()"
            />
          </template>
          <template #totalAmount-cell="{ row }">{{ formatPrice(row.original.totalAmount) }} kr</template>
          <template #expanded="{ row }">
            <!-- Group orders by household within this dinner -->
            <div class="p-4 bg-neutral-50 dark:bg-neutral-900">
              <CostEntry
                  :entry="{date: row.original.date, menuTitle: row.original.menuTitle, items: row.original.items, dinnerEventId: row.original.dinnerEventId}"
                  :level="2"
                  :title-accessor="(e) => formatDate(e.date)"
                  :subtitle-accessor="(e) => e.menuTitle"
                  :stats-accessor="futureDinnerStatsAccessor"
              >
                <!-- Admin correction button in header (div wrapper: slot content must be SSR-consistent) -->
                <template #header-actions>
                  <div>
                    <DangerButton
                        v-if="props.canEdit"
                        label="Admin Korrektion"
                        confirm-label="Klik igen for at rette"
                        :icon="ICONS.authorize"
                        :confirm-icon="ICONS.authorize"
                        :size="SIZES.standard"
                        undo
                        data-testid="admin-correction-btn"
                        @confirm="startEditingDinner(row.original.dinnerEventId)"
                    />
                  </div>
                </template>
                <template #default>
                  <!-- Admin Correction UI (when editing this dinner) -->
                  <div v-if="editingDinnerId === row.original.dinnerEventId" class="p-4 space-y-4 bg-success-50 dark:bg-success-900/20 border-b border-success-200 dark:border-success-800">
                    <div class="flex items-center gap-4">
                      <label :class="TYPOGRAPHY.bodyTextMedium">Vælg husstand:</label>
                      <USelectMenu
                          v-model="selectedHouseholdOption"
                          :items="householdOptions"
                          placeholder="Vælg husstand..."
                          class="w-80"
                          data-testid="admin-correction-household-select"
                      />
                      <UButton
                          color="neutral"
                          variant="ghost"
                          :icon="ICONS.xMark"
                          :size="SIZES.small"
                          aria-label="Annuller"
                          @click="cancelEditing"
                      />
                    </div>

                    <!-- Loading indicator while fetching household -->
                    <div v-if="isLoadingHousehold" class="flex items-center gap-2 text-muted">
                      <UIcon :name="ICONS.sync" class="animate-spin" />
                      <span>Henter husstand...</span>
                    </div>

                    <!-- DinnerBookingForm when household loaded -->
                    <DinnerBookingForm
                        v-else-if="editingHousehold && editingDinnerEvent"
                        :household="editingHousehold"
                        :dinner-event="editingDinnerEvent"
                        :orders="editingOrders"
                        :ticket-prices="ticketPrices"
                        :deadlines="adminDeadlines"
                        :can-edit-admin-override="() => true"
                        @save-bookings="handleAdminSave"
                        @cancel="cancelEditing"
                    />
                  </div>

                  <!-- Household table within dinner (filtered + sorted by address) -->
                  <UTable
                      :data="filterHouseholds(sortByAddress(groupOrdersByHousehold(row.original.items, o => o.priceAtBooking)), getHouseholdSearch(row.original.dinnerEventId))"
                      :columns="householdOrderColumns"
                      :ui="COMPONENTS.table.ui"
                      row-key="householdId"
                  >
                    <template #address-header>
                      <UInput
                          :model-value="getHouseholdSearch(row.original.dinnerEventId)"
                          placeholder="Søg adresse eller navn..."
                          trailing-icon="i-heroicons-magnifying-glass"
                          :size="SIZES.small"
                          @update:model-value="setHouseholdSearch(row.original.dinnerEventId, $event)"
                      />
                    </template>
                    <template #expand-cell="{ row: householdRow }">
                      <UButton
                          v-if="householdRow.original.items.length > 0"
                          color="neutral"
                          variant="ghost"
                          :icon="householdRow.getIsExpanded() ? ICONS.chevronDown : ICONS.chevronRight"
                          square
                          :size="SIZES.small"
                          aria-label="Vis ordrer"
                          @click="householdRow.toggleExpanded()"
                      />
                    </template>
                    <template #address-cell="{ row: householdRow }">{{ householdRow.original.address }} <span :class="TYPOGRAPHY.bodyTextMuted">· PBS {{ householdRow.original.pbsId }}</span></template>
                    <template #totalAmount-cell="{ row: householdRow }">{{ formatPrice(householdRow.original.totalAmount) }} kr</template>

                    <!-- Expanded household: individual order line items -->
                    <template #expanded="{ row: householdRow }">
                      <div class="p-2 bg-neutral-100 dark:bg-neutral-800 space-y-1">
                        <CostLine
                            v-for="order in householdRow.original.items"
                            :key="order.id"
                            :item="order"
                            :history-order-id="historyOrderId"
                            compact
                            @toggle-history="toggleHistory"
                        />
                      </div>
                    </template>
                  </UTable>
                </template>
              </CostEntry>
            </div>
          </template>
          <template #empty>
            <UAlert
                :icon="ICONS.robotHappy"
                color="neutral"
                variant="subtle"
                title="Ingen fremtidige bestillinger"
                description="Der er ingen bookede middage i fremtiden endnu."
            />
          </template>
        </EconomyTable>

        <template v-if="upcomingOrdersGrouped.length > 0" #footer>
          <div class="flex justify-end items-center gap-2">
            <span :class="TYPOGRAPHY.bodyTextMedium">Total:</span>
            <span :class="TYPOGRAPHY.cardTitle">{{ formatPrice(upcomingOrdersTotal) }} kr</span>
          </div>
        </template>
      </UCard>

      <!-- SECTION 2: Faktureringsperioder (unified: virtual + closed) -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon :name="ICONS.clipboard" :size="SIZES.standardIconSize"/>
            <h3 :class="TYPOGRAPHY.cardTitle">Faktureringsperioder</h3>
          </div>
        </template>

        <EconomyTable
            :data="unifiedBillingPeriods"
            :columns="periodColumns"
            row-key="id"
            :date-accessor="(item) => item.period.start"
            search-placeholder="Søg periode..."
            :loading="isBillingPeriodsLoading || isCurrentPeriodLoading"
            :default-sort-desc="true"
        >
          <template #expand-cell="{ row }">
            <UButton
                color="neutral"
                variant="ghost"
                :icon="row.getIsExpanded() ? ICONS.chevronDown : ICONS.chevronRight"
                square
                :size="SIZES.small"
                aria-label="Vis detaljer"
                @click="row.toggleExpanded(); !row.original.isVirtual && loadBillingPeriodDetail(row.original.id as number)"
            />
          </template>
          <template #status-cell="{ row }">
            <UBadge v-if="row.original.isVirtual" color="success" variant="subtle" :size="SIZES.small">
              <UIcon :name="ICONS.ellipsisCircle" :class="SIZES.smallBadgeIcon"/>
              Igangværende
            </UBadge>
            <UBadge v-else color="neutral" variant="subtle" :size="SIZES.small">
              <UIcon :name="ICONS.check" :class="SIZES.smallBadgeIcon"/>
              Afsluttet
            </UBadge>
          </template>
          <template #period-cell="{ row }">
            {{ formatDateRange(row.original.period) }}
          </template>
          <template #totalAmount-cell="{ row }">{{ formatPrice(row.original.totalAmount) }} kr</template>
          <template #control-cell="{ row }">
            <!-- Virtual: ongoing, no control -->
            <span v-if="row.original.isVirtual" class="text-neutral-400">—</span>
            <!-- Closed: show control badge (pre-computed from list endpoint) -->
            <ControlBadge
                v-else
                :computed="row.original.invoiceSum ?? 0"
                :expected="row.original.totalAmount"
            />
          </template>
          <template #share-cell="{ row }">
            <ShareLinksPopover
                v-if="!row.original.isVirtual && row.original.shareToken"
                :share-token="row.original.shareToken"
            />
            <span v-else class="text-neutral-400">—</span>
          </template>

          <!-- Expanded: Virtual row shows current period transactions, closed rows show invoices -->
          <template #expanded="{ row }">
            <div class="p-4 bg-neutral-50 dark:bg-neutral-900 space-y-4">
              <!-- VIRTUAL ROW: Same structure as closed - header + household table -->
              <template v-if="row.original.isVirtual">
                <CostEntry
                    :entry="row.original"
                    :level="1"
                    :title-accessor="virtualPeriodTitleAccessor"
                    :subtitle-accessor="virtualPeriodSubtitleAccessor"
                    :stats-accessor="virtualPeriodStatsAccessor"
                >
                  <template #default>
                    <!-- Virtual invoice table (households) -->
                    <UTable
                        :data="currentPeriodByHousehold"
                        :columns="virtualInvoiceColumns"
                        :ui="COMPONENTS.table.ui"
                        row-key="householdId"
                    >
                      <template #expand-cell="{ row: householdRow }">
                        <UButton
                            v-if="householdRow.original.items.length > 0"
                            color="neutral"
                            variant="ghost"
                            :icon="householdRow.getIsExpanded() ? ICONS.chevronDown : ICONS.chevronRight"
                            square
                            :size="SIZES.small"
                            aria-label="Vis transaktioner"
                            @click="householdRow.toggleExpanded()"
                        />
                      </template>
                      <template #pbsId-cell="{ row: householdRow }">{{ householdRow.original.pbsId }}</template>
                      <template #address-cell="{ row: householdRow }">{{ householdRow.original.address }}</template>
                      <template #totalAmount-cell="{ row: householdRow }">{{ formatPrice(householdRow.original.totalAmount) }} kr</template>
                      <template #control-cell>
                        <span class="text-neutral-400">—</span>
                      </template>

                      <!-- Expanded household: transactions list -->
                      <template #expanded="{ row: householdRow }">
                        <div class="p-2 bg-neutral-100 dark:bg-neutral-800 space-y-1">
                          <CostLine
                              v-for="tx in householdRow.original.items"
                              :key="tx.id"
                              :item="tx"
                              :history-order-id="historyOrderId"
                              compact
                              @toggle-history="toggleHistory"
                          />
                        </div>
                      </template>
                      <template #empty>
                        <UAlert
                            :icon="ICONS.robotHappy"
                            color="neutral"
                            variant="subtle"
                            title="Tomt her!"
                            description="Ingen transaktioner i denne periode endnu."
                        />
                      </template>
                    </UTable>
                  </template>
                </CostEntry>
              </template>

              <!-- CLOSED ROW: Invoice list (nested UTable) with expandable transactions -->
              <template v-else>
                <Loader v-if="isBillingPeriodDetailLoading" text="Henter fakturadetaljer..."/>

                <template v-else-if="selectedBillingPeriodDetail">
                  <!-- Invoice table with stat header via CostEntry (Level 1 - Ocean palette) -->
                  <CostEntry
                      :entry="row.original"
                      :level="1"
                      :title-accessor="billingPeriodTitleAccessor"
                      :subtitle-accessor="billingPeriodSubtitleAccessor"
                      :stats-accessor="billingPeriodStatsAccessor"
                  >
                    <template #default>
                      <!-- Invoice table -->
                      <UTable
                        v-model:expanded="expandedInvoiceRows"
                        :data="selectedBillingPeriodDetail.invoices"
                        :columns="invoiceColumns"
                        :ui="COMPONENTS.table.ui"
                        row-key="id"
                    >
                    <template #expand-cell="{ row: invoiceRow }">
                      <UButton
                          color="neutral"
                          variant="ghost"
                          :icon="invoiceRow.getIsExpanded() ? ICONS.chevronDown : ICONS.chevronRight"
                          square
                          :size="SIZES.small"
                          aria-label="Vis transaktioner"
                          @click="invoiceRow.toggleExpanded(); loadInvoiceTransactions(invoiceRow.original.id)"
                      />
                    </template>
                    <template #pbsId-cell="{ row: invoiceRow }">{{ invoiceRow.original.pbsId }}</template>
                    <template #address-cell="{ row: invoiceRow }">{{ invoiceRow.original.address }}</template>
                    <template #amount-cell="{ row: invoiceRow }">{{ formatPrice(invoiceRow.original.amount) }} kr</template>
                    <template #control-cell="{ row: invoiceRow }">
                      <ControlBadge
                          :computed="invoiceRow.original.transactionSum"
                          :expected="invoiceRow.original.amount"
                      />
                    </template>

                    <!-- Expanded invoice: transactions table grouped by dinner -->
                    <template #expanded="{ row: invoiceRow }">
                      <div class="p-2 bg-neutral-100 dark:bg-neutral-800">
                        <!-- Level 2: Dinner breakdown with stat box header (Peach palette) -->
                        <div v-if="invoiceTransactionsGrouped.length > 0 || isInvoiceTransactionsLoading" class="rounded-lg overflow-hidden border border-default">
                          <!-- Header row: title + stat boxes -->
                          <div :class="['flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4', COMPONENTS.economyTable.level2.header]">
                            <div class="md:mr-8">
                              <h4 :class="TYPOGRAPHY.cardTitle">PBS Faktura for {{ formatDate(selectedBillingPeriodDetail.paymentDate, 'MMMM yyyy') }}</h4>
                              <p :class="TYPOGRAPHY.bodyTextMuted">{{ invoiceRow.original.address }} · PBS {{ invoiceRow.original.pbsId }}</p>
                            </div>
                            <div class="flex flex-wrap gap-2">
                              <div :class="['flex items-center gap-2 px-3 py-2', COMPONENTS.economyTable.level2.statBox]">
                                <UIcon :name="ICONS.calendar" :class="COMPONENTS.economyTable.level2.icon"/>
                                <div class="text-center">
                                  <p class="font-semibold">{{ dinnerBreakdownStats.dinnerCount }}</p>
                                  <p class="text-xs text-muted">Middage</p>
                                </div>
                              </div>
                              <div :class="['flex items-center gap-2 px-3 py-2', COMPONENTS.economyTable.level2.statBox]">
                                <UIcon :name="ICONS.dinner" :class="COMPONENTS.economyTable.level2.icon"/>
                                <div class="text-center">
                                  <p class="font-semibold">{{ dinnerBreakdownStats.ticketCounts }}</p>
                                  <p class="text-xs text-muted">Kuverter</p>
                                </div>
                              </div>
                              <div :class="['flex items-center gap-2 px-3 py-2', COMPONENTS.economyTable.level2.statBox]">
                                <UIcon :name="ICONS.shoppingCart" :class="COMPONENTS.economyTable.level2.icon"/>
                                <div class="text-center">
                                  <p class="font-semibold">{{ formatPrice(dinnerBreakdownStats.total) }} kr</p>
                                  <p class="text-xs text-muted">Total</p>
                                </div>
                              </div>
                            </div>
                          </div>
                          <!-- Dinner breakdown table -->
                          <UTable
                              :data="invoiceTransactionsGrouped"
                              :columns="[
                                {id: 'expand'},
                                {accessorKey: 'date', header: 'Dato'},
                                {accessorKey: 'menuTitle', header: 'Menu'},
                                {accessorKey: 'ticketCounts', header: 'Kuverter'},
                                {accessorKey: 'totalAmount', header: 'Beløb'}
                              ]"
                              :ui="{...COMPONENTS.table.ui, thead: 'bg-peach-100 dark:bg-peach-900'}"
                              :loading="isInvoiceTransactionsLoading"
                              row-key="dinnerEventId"
                          >
                          <template #expand-cell="{ row: dinnerRow }">
                            <UButton
                                v-if="dinnerRow.original.items.length > 0"
                                color="neutral"
                                variant="ghost"
                                :icon="dinnerRow.getIsExpanded() ? ICONS.chevronDown : ICONS.chevronRight"
                                square
                                :size="SIZES.small"
                                aria-label="Vis ordrer"
                                @click="dinnerRow.toggleExpanded()"
                            />
                          </template>
                          <template #date-cell="{ row: dinnerRow }">{{ formatDate(dinnerRow.original.date) }}</template>
                          <template #totalAmount-cell="{ row: dinnerRow }">{{ formatPrice(dinnerRow.original.totalAmount) }} kr</template>

                          <!-- Expanded dinner: individual transactions with history -->
                          <template #expanded="{ row: dinnerRow }">
                            <div class="p-2 bg-neutral-50 dark:bg-neutral-900 space-y-1">
                              <CostLine
                                  v-for="tx in dinnerRow.original.items"
                                  :key="tx.id"
                                  :item="tx"
                                  :history-order-id="historyOrderId"
                                  compact
                                  @toggle-history="toggleHistory"
                              />
                            </div>
                          </template>
                        </UTable>
                        </div>
                        <UAlert
                            v-else
                            :icon="ICONS.robotHappy"
                            color="neutral"
                            variant="subtle"
                            title="Tomt her!"
                            description="Ingen transaktioner på denne faktura."
                        />
                      </div>
                    </template>

                    <!-- Footer with total and control sum -->
                    <template #footer>
                      <div class="flex justify-between items-center">
                        <span :class="TYPOGRAPHY.bodyTextMedium">
                          Total: {{ selectedBillingPeriodDetail.invoices.length }} husstande
                        </span>
                        <div class="flex items-center gap-4">
                          <span :class="TYPOGRAPHY.cardTitle">
                            {{ formatPrice(selectedBillingPeriodDetail.totalAmount) }} kr
                          </span>
                          <span v-if="billingPeriodControlSum?.isValid" class="text-success-600 dark:text-success-400 flex items-center gap-1">
                            <UIcon :name="ICONS.robotHappy" :class="SIZES.smallBadgeIcon"/>
                            {{ formatPrice(billingPeriodControlSum.computed) }} kr
                          </span>
                          <span v-else-if="billingPeriodControlSum" class="text-error-600 dark:text-error-400 flex items-center gap-1">
                            <UIcon :name="ICONS.robotDead" :class="SIZES.smallBadgeIcon"/>
                            {{ formatPrice(billingPeriodControlSum.computed) }} kr
                          </span>
                        </div>
                      </div>
                    </template>
                  </UTable>
                    </template>
                  </CostEntry>

                  <!-- Share & Download actions (closed periods only) -->
                  <div class="flex items-center gap-2 border-t pt-4">
                    <span :class="TYPOGRAPHY.bodyTextMuted">Del med bogholder:</span>
                    <ShareLinksPopover :share-token="selectedBillingPeriodDetail.shareToken"/>
                  </div>
                </template>
              </template>
            </div>
          </template>
        </EconomyTable>
      </UCard>
    </template>
  </div>
</template>
