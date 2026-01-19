<script setup lang="ts">
/**
 * HouseholdEconomy - Billing view for household (Økonomi tab)
 *
 * Two sections (unified pattern matching AdminEconomy):
 * - Kommende: upcoming orders (BOOKED/RELEASED for future dinners)
 * - Faktureringsperioder: unified table with virtual (current) + closed (past) periods
 *
 * Uses EconomyTable for tables, CostEntry/CostLine for grouped items.
 * Data: GET /api/billing?householdId=X + orders from bookingsStore + dinnerEvents from planStore
 */
import {formatDate, createDateRange, formatDateRange} from '~/utils/date'
import type {DateRange} from '~/types/dateTypes'
import type {HouseholdBillingResponse, TransactionDisplay, CostEntry} from '~/composables/useBillingValidation'
import type {OrderDisplay} from '~/composables/useBookingValidation'

interface Props {
    household: {id: number}
}

const props = defineProps<Props>()

// Composables
const {formatPrice} = useTicket()
const {groupByCostEntry, joinOrdersWithDinnerEvents, calculateCurrentBillingPeriod, formatTicketCounts} = useBilling()
const {ICONS, SIZES, TYPOGRAPHY, COMPONENTS} = useTheSlopeDesignSystem()
const {OrderStateSchema} = useBookingValidation()
const {HouseholdBillingResponseSchema} = useBillingValidation()

// Stores for dinner events (for date/menu info)
const planStore = usePlanStore()
const {selectedSeason, isSelectedSeasonInitialized} = storeToRefs(planStore)
planStore.initPlanStore()

const householdsStore = useHouseholdsStore()
const {selectedHousehold} = storeToRefs(householdsStore)

// Local orders fetch (ADR-007 exception - component-local data)
// Empty dinnerEventIds = all orders for household (endpoint auto-filters by session)
const {data: orders, status: ordersStatus} = useAsyncData<OrderDisplay[]>(
    `economy-orders-${props.household.id}`,
    () => $fetch<OrderDisplay[]>('/api/order'),
    {default: () => []}
)
const isOrdersLoading = computed(() => ordersStatus.value === 'pending')

// Data fetch (ADR-007: component-local exception)
const {data: billing, status, error} = useAsyncData<HouseholdBillingResponse | null>(
    `billing-${props.household.id}`,
    () => $fetch<HouseholdBillingResponse>('/api/billing', {query: {householdId: props.household.id}}),
    {
        default: () => null,
        transform: (data) => data ? HouseholdBillingResponseSchema.parse(data) : null
    }
)

const isLoading = computed(() => status.value === 'pending')
const isErrored = computed(() => status.value === 'error')

// Dinner time splitter for past/future classification
const {splitDinnerEvents} = useSeason()

// Split dinner events into past/future using dinner time logic
const dinnerEvents = computed(() => selectedSeason.value?.dinnerEvents ?? [])
const splitResult = computed(() => splitDinnerEvents(dinnerEvents.value))
const futureDinnerIds = computed(() => {
    const futureDates = new Set(splitResult.value.futureDinnerDates.map(d => d.getTime()))
    return new Set(dinnerEvents.value.filter(e => futureDates.has(e.date.getTime())).map(e => e.id))
})

// Dinner events lookup for joining orders
const dinnerEventsMap = computed(() =>
    new Map(dinnerEvents.value.map(e => [e.id, { id: e.id, date: e.date, menuTitle: e.menuTitle }]))
)

// Inhabitants lookup for name resolution
const inhabitantsMap = computed(() => {
    const inhabitants = selectedHousehold.value?.inhabitants ?? []
    return new Map(inhabitants.map(i => [i.id, i.name]))
})
const getInhabitantName = (id: number) => inhabitantsMap.value.get(id) ?? `#${id}`

// Upcoming orders (BOOKED/RELEASED for future dinners)
const upcomingOrdersData = computed(() => {
    if (!isSelectedSeasonInitialized.value) return []

    // Filter: BOOKED/RELEASED, future dinner (using splitDinnerEvents logic)
    const upcomingOrders = orders.value.filter(o =>
        (o.state === OrderStateSchema.enum.BOOKED || o.state === OrderStateSchema.enum.RELEASED) &&
        futureDinnerIds.value.has(o.dinnerEventId)
    )

    // Join using pure function
    const ordersWithDinner = joinOrdersWithDinnerEvents(
        upcomingOrders,
        dinnerEventsMap.value,
        getInhabitantName
    )

    const groupOrdersByDinner = groupByCostEntry<typeof ordersWithDinner[number]>(o => o.dinnerEvent)
    return groupOrdersByDinner(ordersWithDinner, o => o.priceAtBooking)
})

// Curried grouper for transactions by dinner
const groupTxByDinner = groupByCostEntry<TransactionDisplay>(tx => tx.dinnerEvent)

// Current period grouped data
const currentPeriodData = computed(() =>
    billing.value ? groupTxByDinner(billing.value.currentPeriod.transactions, tx => tx.amount) : []
)

// ========== UNIFIED BILLING PERIODS (matches AdminEconomy pattern) ==========

/**
 * UnifiedBillingPeriod - Represents both virtual (current) and closed (past) periods
 * Same interface as AdminEconomy's unifiedBillingPeriods
 */
interface UnifiedBillingPeriod {
    id: number | 'virtual'      // 'virtual' for current period, number for past invoices
    period: DateRange           // For EconomyTable date filtering/sorting
    billingPeriod: string       // Display string
    totalAmount: number
    dinnerCount: number
    ticketCounts: string
    isClosed: boolean           // true = past invoice, false = virtual/current
    groups: CostEntry<TransactionDisplay>[]  // Grouped transactions by dinner
    transactionSum: number      // Control sum: Σ transaction amounts
}

// Unified billing periods (virtual + closed)
const unifiedBillingPeriods = computed((): UnifiedBillingPeriod[] => {
    if (!billing.value) return []

    const periods: UnifiedBillingPeriod[] = []

    // Virtual row (current period - not yet billed)
    const currentPeriod = billing.value.currentPeriod
    const currentPeriodRange = createDateRange(
        new Date(currentPeriod.periodStart),
        new Date(currentPeriod.periodEnd)
    )
    const currentGroups = currentPeriodData.value

    // Control sum for virtual: Σ transaction amounts
    const virtualTransactionSum = currentPeriod.transactions.reduce((sum, tx) => sum + tx.amount, 0)

    periods.push({
        id: 'virtual',
        period: currentPeriodRange,
        billingPeriod: formatDateRange(currentPeriodRange),
        totalAmount: currentPeriod.totalAmount,
        dinnerCount: currentGroups.length,
        ticketCounts: formatTicketCounts(currentPeriod.transactions),
        isClosed: false,
        groups: currentGroups,
        transactionSum: virtualTransactionSum
    })

    // Closed rows (past invoices)
    for (const inv of billing.value.pastInvoices) {
        const groups = groupTxByDinner(inv.transactions, tx => tx.amount)
        // Control sum: Σ transaction amounts vs invoice amount
        const invoiceTransactionSum = inv.transactions.reduce((sum, tx) => sum + tx.amount, 0)
        periods.push({
            id: inv.id,
            period: createDateRange(new Date(inv.cutoffDate), new Date(inv.paymentDate)),
            billingPeriod: inv.billingPeriod.replace('-', ' - '),
            totalAmount: inv.amount,
            dinnerCount: groups.length,
            ticketCounts: formatTicketCounts(inv.transactions),
            isClosed: true,
            groups,
            transactionSum: invoiceTransactionSum
        })
    }

    return periods
})

// Unified period columns (matches AdminEconomy pattern with control column)
const periodColumns = [
    {id: 'expand'},
    {accessorKey: 'status', header: 'Status'},
    {accessorKey: 'billingPeriod', header: 'Periode'},
    {accessorKey: 'ticketCounts', header: 'Kuverter'},
    {accessorKey: 'totalAmount', header: 'Beløb'},
    {accessorKey: 'control', header: 'Kontrol'}
]

// Single history visible at a time
const historyOrderId = ref<number | null>(null)
const toggleHistory = (orderId: number | null) => {
    historyOrderId.value = historyOrderId.value === orderId ? null : orderId
}

// Dinner columns (for EconomyTable)
const dinnerColumns = [
    {id: 'expand'},
    {accessorKey: 'date', header: 'Dato'},
    {accessorKey: 'menuTitle', header: 'Menu'},
    {accessorKey: 'ticketCounts', header: 'Kuverter'},
    {accessorKey: 'totalAmount', header: 'Beløb'}
]

// Totals (using raw data - EconomyTable handles filtering internally)
const upcomingTotal = computed(() =>
    upcomingOrdersData.value.reduce((sum, g) => sum + g.totalAmount, 0)
)

// Upcoming period starts after current billing period
const upcomingPeriodStart = computed(() => {
    const currentPeriod = calculateCurrentBillingPeriod()
    const startDate = new Date(currentPeriod.end)
    startDate.setDate(startDate.getDate() + 1)
    return startDate
})
</script>

<template>
  <div data-testid="household-economy" class="space-y-6">
    <ViewError v-if="isErrored" :error="error?.statusCode" message="Kunne ikke hente økonomioversigt"/>
    <Loader v-else-if="isLoading" text="Henter økonomioversigt..."/>

    <template v-else-if="billing">
      <!-- Section 1: Kommende (Upcoming Orders) -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon :name="ICONS.calendar" :size="SIZES.standardIconSize"/>
            <div class="flex flex-col md:flex-row md:items-center md:gap-2">
              <h3 :class="TYPOGRAPHY.cardTitle">Kommende</h3>
              <span class="hidden md:inline text-gray-400">|</span>
              <p :class="TYPOGRAPHY.bodyTextMuted">{{ formatDate(upcomingPeriodStart) }} → ...</p>
            </div>
          </div>
        </template>

        <EconomyTable
            :data="upcomingOrdersData"
            :columns="dinnerColumns"
            row-key="dinnerEventId"
            :date-accessor="(item) => item.date"
            :loading="isOrdersLoading"
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
            <UCard class="ml-2 md:ml-8 mr-2 md:mr-4 my-2">
              <div class="space-y-2 max-h-64 md:max-h-96 overflow-y-auto">
                <CostLine
                    v-for="order in row.original.items"
                    :key="order.id"
                    :item="order"
                    :history-order-id="historyOrderId"
                    @toggle-history="toggleHistory"
                />
              </div>
            </UCard>
          </template>
          <template #empty>
            <UAlert
                :icon="ICONS.robotHappy"
                color="neutral"
                variant="subtle"
                title="Ingen kommende bestillinger"
                description="Du har ikke booket nogen middage endnu - hop over til Tilmeldinger!"
            />
          </template>
        </EconomyTable>

        <template v-if="upcomingOrdersData.length > 0" #footer>
          <div class="flex justify-end items-center gap-2">
            <span :class="TYPOGRAPHY.bodyTextMedium">Forventet:</span>
            <span :class="TYPOGRAPHY.cardTitle">{{ formatPrice(upcomingTotal) }} kr</span>
          </div>
        </template>
      </UCard>

      <!-- Section 2: Faktureringsperioder (Unified: Virtual + Closed) -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon :name="ICONS.economy" :size="SIZES.standardIconSize"/>
            <h3 :class="TYPOGRAPHY.cardTitle">Faktureringsperioder</h3>
          </div>
        </template>

        <EconomyTable
            :data="unifiedBillingPeriods"
            :columns="periodColumns"
            row-key="id"
            :date-accessor="(item) => item.period.start"
            search-placeholder="Søg periode..."
        >
          <template #expand-cell="{ row }">
            <UButton
                v-if="row.original.groups.length > 0"
                color="neutral"
                variant="ghost"
                :icon="row.getIsExpanded() ? ICONS.chevronDown : ICONS.chevronRight"
                square
                :size="SIZES.small"
                aria-label="Vis detaljer"
                @click="row.toggleExpanded()"
            />
          </template>
          <template #status-cell="{ row }">
            <UBadge v-if="!row.original.isClosed" color="success" variant="subtle" :size="SIZES.small">
              <UIcon :name="ICONS.ellipsisCircle" :class="SIZES.smallBadgeIcon"/>
              Igangværende
            </UBadge>
            <UBadge v-else color="neutral" variant="subtle" :size="SIZES.small">
              <UIcon :name="ICONS.check" :class="SIZES.smallBadgeIcon"/>
              Afsluttet
            </UBadge>
          </template>
          <template #totalAmount-cell="{ row }">{{ formatPrice(row.original.totalAmount) }} kr</template>
          <template #control-cell="{ row }">
            <!-- Control sum: Σ transaction amounts vs stored totalAmount -->
            <UBadge v-if="row.original.transactionSum === row.original.totalAmount" color="success" variant="subtle" :size="SIZES.small">
              <UIcon :name="ICONS.robotHappy" :class="SIZES.smallBadgeIcon"/>
              {{ formatPrice(row.original.transactionSum) }} kr
            </UBadge>
            <UBadge v-else color="error" variant="subtle" :size="SIZES.small">
              <UIcon :name="ICONS.robotDead" :class="SIZES.smallBadgeIcon"/>
              {{ formatPrice(row.original.transactionSum) }} kr ≠ {{ formatPrice(row.original.totalAmount) }} kr
            </UBadge>
          </template>
          <template #expanded="{ row }">
            <div class="ml-2 md:ml-8 mr-2 md:mr-4 my-2 rounded-lg overflow-hidden border border-default">
              <!-- Stat header (Level 1 - Ocean palette) -->
              <div :class="['flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4', COMPONENTS.economyTable.level1.header]">
                <div class="md:mr-8">
                  <h4 :class="TYPOGRAPHY.cardTitle">{{ row.original.isClosed ? 'PBS Faktura' : 'Aktuel periode' }}</h4>
                  <p :class="TYPOGRAPHY.bodyTextMuted">{{ row.original.billingPeriod }}</p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <div :class="['flex items-center gap-2 px-3 py-2', COMPONENTS.economyTable.level1.statBox]">
                    <UIcon :name="ICONS.calendar" :class="COMPONENTS.economyTable.level1.icon"/>
                    <div class="text-center">
                      <p class="font-semibold">{{ row.original.dinnerCount }}</p>
                      <p class="text-xs text-muted">Middage</p>
                    </div>
                  </div>
                  <div :class="['flex items-center gap-2 px-3 py-2', COMPONENTS.economyTable.level1.statBox]">
                    <UIcon :name="ICONS.dinner" :class="COMPONENTS.economyTable.level1.icon"/>
                    <div class="text-center">
                      <p class="font-semibold">{{ row.original.ticketCounts }}</p>
                      <p class="text-xs text-muted">Kuverter</p>
                    </div>
                  </div>
                  <div :class="['flex items-center gap-2 px-3 py-2', COMPONENTS.economyTable.level1.statBox]">
                    <UIcon :name="ICONS.shoppingCart" :class="COMPONENTS.economyTable.level1.icon"/>
                    <div class="text-center">
                      <p class="font-semibold">{{ formatPrice(row.original.totalAmount) }} kr</p>
                      <p class="text-xs text-muted">Total</p>
                    </div>
                  </div>
                </div>
              </div>
              <!-- Dinner breakdown table (same pattern as AdminEconomy) -->
              <UTable
                  :data="row.original.groups"
                  :columns="dinnerColumns"
                  :ui="{...COMPONENTS.table.ui, thead: COMPONENTS.economyTable.level2.header}"
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
          </template>
          <template #empty>
            <UAlert
                :icon="ICONS.robotHappy"
                color="neutral"
                variant="subtle"
                title="Ingen faktureringsperioder"
                description="Der er ingen transaktioner endnu - PBS-robotten sover stadig!"
            />
          </template>
        </EconomyTable>
      </UCard>
    </template>

    <UAlert
        v-else
        :icon="ICONS.exclamationCircle"
        color="warning"
        variant="subtle"
        title="Ingen data"
        description="Kunne ikke hente økonomioversigt."
    />
  </div>
</template>
