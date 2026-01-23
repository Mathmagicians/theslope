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
import type {OrderDisplay, DinnerEventInfo} from '~/composables/useBookingValidation'
import type {StatBox} from '~/components/economy/CostEntry.vue'
import type {HouseholdDetail} from '~/composables/useCoreValidation'

interface Props {
    household: HouseholdDetail
}

const props = defineProps<Props>()

// Composables
const {formatPrice} = useTicket()
const {groupByCostEntry, calculateCurrentBillingPeriod, formatTicketCounts} = useBilling()
const {ICONS, SIZES, TYPOGRAPHY, COMPONENTS} = useTheSlopeDesignSystem()
const {OrderStateSchema} = useBookingValidation()
const {HouseholdBillingResponseSchema} = useBillingValidation()

// Accessor functions for CostEntry (reusable lambdas)
const periodTitleAccessor = (period: UnifiedBillingPeriod) =>
    period.isClosed ? 'PBS Faktura' : 'Aktuel periode'

const periodSubtitleAccessor = (period: UnifiedBillingPeriod) =>
    period.billingPeriod

const periodStatsAccessor = (period: UnifiedBillingPeriod): StatBox[] => [
    {icon: ICONS.calendar, value: period.dinnerCount, label: 'Middage'},
    {icon: ICONS.dinner, value: period.ticketCounts, label: 'Kuverter'},
    {icon: ICONS.shoppingCart, value: `${formatPrice(period.totalAmount)} kr`, label: 'Total'}
]

const periodControlSumAccessor = (period: UnifiedBillingPeriod) => ({
    computed: period.transactionSum,
    expected: period.totalAmount
})

const periodItemsAccessor = (period: UnifiedBillingPeriod) => period.groups

const planStore = usePlanStore()
const {selectedSeason, isSelectedSeasonInitialized} = storeToRefs(planStore)
planStore.initPlanStore()

const {OrderDisplaySchema} = useBookingValidation()
const selectedSeasonId = computed(() => selectedSeason.value?.id)
const {data: orders, status: ordersStatus} = useAsyncData<OrderDisplay[]>(
    computed(() => `economy-orders-${props.household.id}-season-${selectedSeasonId.value ?? 'none'}`),
    () => {
        if (!selectedSeasonId.value) return Promise.resolve([])
        return $fetch<OrderDisplay[]>('/api/order', {
            query: {
                householdId: props.household.id,
                upcomingForSeason: selectedSeasonId.value,
                includeDinnerContext: true
            }
        })
    },
    {
        default: () => [],
        transform: (data: unknown[]) => (data as Record<string, unknown>[]).map(o => OrderDisplaySchema.parse(o)),
        watch: [() => props.household.id, selectedSeasonId]
    }
)
const isOrdersLoading = computed(() => ordersStatus.value === 'pending')
const isUpcomingOrdersLoading = computed(() => isOrdersLoading.value || !isSelectedSeasonInitialized.value)

// Data fetch (ADR-007: component-local exception)
const householdId = computed(() => props.household.id)
const {data: billing, status, error} = useAsyncData<HouseholdBillingResponse | null>(
    computed(() => `billing-${householdId.value}`),
    () => $fetch<HouseholdBillingResponse>('/api/billing', {query: {householdId: householdId.value}}),
    {
        default: () => null,
        transform: (data) => data ? HouseholdBillingResponseSchema.parse(data) : null,
        watch: [householdId]
    }
)

const isLoading = computed(() => status.value === 'pending')
const isErrored = computed(() => status.value === 'error')


// Inhabitants lookup for name resolution
const inhabitantsMap = computed(() => {
    const inhabitants = props.household.inhabitants ?? []
    return new Map(inhabitants.map(i => [i.id, i.name]))
})
const getInhabitantName = (id: number) => inhabitantsMap.value.get(id) ?? `#${id}`

type OrderWithContext = OrderDisplay & { dinnerEvent: DinnerEventInfo, inhabitant: { id: number, name: string } }

const groupOrdersByDinner = groupByCostEntry<OrderWithContext>()
const upcomingOrdersData = computed(() => {
    return groupOrdersByDinner(
        orders.value
            .filter((o): o is OrderDisplay & { dinnerEvent: DinnerEventInfo } =>
                (o.state === OrderStateSchema.enum.BOOKED || o.state === OrderStateSchema.enum.RELEASED) &&
                o.dinnerEvent !== undefined
            )
            .map(o => ({
                ...o,
                inhabitant: { id: o.inhabitantId, name: getInhabitantName(o.inhabitantId) }
            })),
        o => o.priceAtBooking
    )
})

// Curried grouper for transactions by dinner
const groupTxByDinner = groupByCostEntry<TransactionDisplay>()

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
    groups: CostEntry<TransactionDisplay, DinnerEventInfo>[]  // Grouped transactions by dinner
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
            row-key="dinnerEvent.id"
            :date-accessor="(item) => item.dinnerEvent.date"
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
            :default-sort-desc="true"
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
            <ControlBadge :computed="row.original.transactionSum" :expected="row.original.totalAmount"/>
          </template>
          <template #expanded="{ row }">
            <CostEntry
                :entry="row.original"
                :level="1"
                :title-accessor="periodTitleAccessor"
                :subtitle-accessor="periodSubtitleAccessor"
                :stats-accessor="periodStatsAccessor"
                :control-sum-accessor="periodControlSumAccessor"
                :items-accessor="periodItemsAccessor"
                class="ml-2 md:ml-8 mr-2 md:mr-4 my-2"
            >
              <template #default="{ items }">
                <!-- Dinner breakdown table (ocean palette to match Level 1 header) -->
                <UTable
                    :data="items"
                    :columns="dinnerColumns"
                    :ui="{...COMPONENTS.table.ui, thead: 'bg-ocean-100 dark:bg-ocean-900'}"
                    row-key="dinnerEvent.id"
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
                  <template #date-cell="{ row: dinnerRow }">{{ formatDate(dinnerRow.original.dinnerEvent.date) }}</template>
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
              </template>
            </CostEntry>
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
