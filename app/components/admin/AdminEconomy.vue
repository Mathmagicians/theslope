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
import type {OrderDisplay} from '~/composables/useBookingValidation'

const {formatPrice} = useTicket()
const {groupByCostEntry, joinOrdersWithDinnerEvents, calculateCurrentBillingPeriod, controlInvoices, controlTransactions} = useBilling()
const {splitDinnerEvents} = useSeason()
const {ICONS, SIZES, TYPOGRAPHY, COMPONENTS} = useTheSlopeDesignSystem()
const {OrderStateSchema, OrderDisplaySchema} = useBookingValidation()
const OrderState = OrderStateSchema.enum

// Plan store for future dinners
const planStore = usePlanStore()
const {selectedSeason, isSelectedSeasonInitialized} = storeToRefs(planStore)
planStore.initPlanStore()

// Households store for inhabitant name lookup
const householdsStore = useHouseholdsStore()
const {allInhabitants} = storeToRefs(householdsStore)
householdsStore.initHouseholdsStore()

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

// Future dinner IDs (using splitDinnerEvents logic)
const splitResult = computed(() => splitDinnerEvents(dinnerEvents.value))
const futureDinnerIds = computed(() => {
    const futureDates = new Set(splitResult.value.futureDinnerDates.map(d => d.getTime()))
    return new Set(dinnerEvents.value.filter(e => futureDates.has(e.date.getTime())).map(e => e.id))
})

// Inhabitant name lookup
const inhabitantsMap = computed(() => new Map(allInhabitants.value.map(i => [i.id, i.name])))
const getInhabitantName = (id: number) => inhabitantsMap.value.get(id) ?? `#${id}`

// Fetch future orders (admin: all households)
const futureDinnerIdsArray = computed(() => Array.from(futureDinnerIds.value))
const {data: futureOrders, status: futureOrdersStatus} = useAsyncData<OrderDisplay[]>(
    `admin-economy-future-orders-${futureDinnerIdsArray.value.join('-')}`,
    () => {
        if (futureDinnerIdsArray.value.length === 0) return Promise.resolve([])
        const params = new URLSearchParams()
        futureDinnerIdsArray.value.forEach(id => params.append('dinnerEventIds', String(id)))
        params.append('allHouseholds', 'true')
        return $fetch<OrderDisplay[]>(`/api/order?${params.toString()}`)
    },
    {
        default: () => [],
        transform: (data: unknown[]) => (data as Record<string, unknown>[]).map(o => OrderDisplaySchema.parse(o))
    }
)
const isFutureOrdersLoading = computed(() => futureOrdersStatus.value === 'pending')

// Future orders grouped by dinner (with order state for display)
type OrderWithDinner = OrderDisplay & {dinnerEvent: {id: number, date: Date, menuTitle: string}, inhabitant: {id: number, name: string}}
const futureOrdersWithDinner = computed(() =>
    joinOrdersWithDinnerEvents(futureOrders.value, dinnerEventsMap.value, getInhabitantName) as OrderWithDinner[]
)
const groupOrdersByDinner = groupByCostEntry<OrderWithDinner>(o => o.dinnerEvent)
const futureOrdersGrouped = computed(() =>
    groupOrdersByDinner(futureOrdersWithDinner.value, o => o.priceAtBooking)
)
const futureOrdersTotal = computed(() =>
    futureOrdersWithDinner.value.reduce((sum, o) => sum + o.priceAtBooking, 0)
)

// Dinner columns for orders table
const dinnerColumns = [
    {id: 'expand'},
    {accessorKey: 'date', header: 'Dato'},
    {accessorKey: 'menuTitle', header: 'Menu'},
    {accessorKey: 'ticketCounts', header: 'Kuverter'},
    {accessorKey: 'totalAmount', header: 'Beløb'}
]

// ========== SECTION 2: FAKTURERINGSPERIODER (unified) ==========

// Current billing period dates
const currentPeriod = computed(() => calculateCurrentBillingPeriod())

// Curried grouper for transactions by dinner
const groupTxByDinner = groupByCostEntry<TransactionDisplay>(tx => tx.dinnerEvent)

// Current period grouped by dinner (for virtual row expansion)
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
    totalAmount: number
    invoiceSum: number | null   // Σ invoice.amount for control sum (null for virtual)
    shareToken?: string
}

const unifiedBillingPeriods = computed((): UnifiedBillingPeriod[] => {
    // Virtual row (current period)
    const virtualRow: UnifiedBillingPeriod = {
        id: 'virtual',
        isVirtual: true,
        period: currentPeriod.value,
        cutoffDate: null,
        paymentDate: null,
        householdCount: currentPeriodHouseholdCount.value,
        totalAmount: currentPeriodTotal.value,
        invoiceSum: null  // No invoices for virtual (ongoing)
    }

    // Closed periods - parse DateRange from billingPeriod string "dd/MM/yyyy-dd/MM/yyyy"
    const closedRows: UnifiedBillingPeriod[] = billingPeriods.value.map(bp => {
        const [startStr, endStr] = bp.billingPeriod.split('-')
        const parseDate = (s: string) => {
            const [day, month, year] = s.split('/').map(Number)
            return new Date(year, month - 1, day)
        }
        return {
            id: bp.id,
            isVirtual: false,
            period: {start: parseDate(startStr), end: parseDate(endStr)},
            cutoffDate: bp.cutoffDate,
            paymentDate: bp.paymentDate,
            householdCount: bp.householdCount,
            totalAmount: bp.totalAmount,
            invoiceSum: bp.invoiceSum,  // Pre-computed for control sum display
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
    {accessorKey: 'control', header: 'Kontrol (Σtx)'}
]

// Nested table expansion state (for invoices)
const {expanded: expandedInvoiceRows} = useExpandableRow()

// Track which invoice is currently loaded (for control sum display)
const loadedInvoiceId = ref<number | null>(null)

// Control sum for loaded invoice's transactions
const invoiceControlSum = computed(() => {
    if (!loadedInvoiceId.value) return null
    const invoice = selectedBillingPeriodDetail.value?.invoices.find(i => i.id === loadedInvoiceId.value)
    if (!invoice) return null
    return controlTransactions(selectedInvoiceTransactions.value, invoice.amount)
})

// Get control sum result for an invoice (null if not loaded)
const getInvoiceControl = (invoiceId: number) => {
    if (loadedInvoiceId.value !== invoiceId) return null
    return invoiceControlSum.value
}

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

</script>

<template>
  <div data-testid="admin-economy" class="space-y-6">
    <ViewError v-if="isBillingPeriodsErrored" :error="billingPeriodsError?.statusCode" message="Kunne ikke hente økonomioversigt"/>
    <Loader v-else-if="isBillingPeriodsLoading || !isSelectedSeasonInitialized" text="Henter økonomioversigt..."/>

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
            :data="futureOrdersGrouped"
            :columns="dinnerColumns"
            row-key="dinnerEventId"
            :date-accessor="(item) => item.date"
            :loading="isFutureOrdersLoading"
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
                    :inhabitant-name="order.inhabitant.name"
                    :ticket-type="order.ticketType"
                    :amount="order.priceAtBooking"
                    :order-id="order.id"
                    :history-order-id="historyOrderId"
                    :order="order"
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
                title="Ingen fremtidige bestillinger"
                description="Der er ingen bookede middage i fremtiden endnu."
            />
          </template>
        </EconomyTable>

        <template v-if="futureOrdersGrouped.length > 0" #footer>
          <div class="flex justify-end items-center gap-2">
            <span :class="TYPOGRAPHY.bodyTextMedium">Total:</span>
            <span :class="TYPOGRAPHY.cardTitle">{{ formatPrice(futureOrdersTotal) }} kr</span>
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
            :loading="isCurrentPeriodLoading"
        >
          <template #expand-cell="{ row }">
            <UButton
                color="neutral"
                variant="ghost"
                :icon="row.getIsExpanded() ? ICONS.chevronDown : ICONS.chevronRight"
                square
                :size="SIZES.small"
                aria-label="Vis detaljer"
                @click="row.toggleExpanded(); !row.original.isVirtual && loadBillingPeriodDetail(row.original.id)"
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
            <!-- Closed: show badge with sum + robot (pre-computed from list endpoint) -->
            <template v-else>
              <UBadge v-if="row.original.invoiceSum === row.original.totalAmount" color="success" variant="subtle" :size="SIZES.small">
                <UIcon :name="ICONS.robotHappy" :class="SIZES.smallBadgeIcon"/>
                {{ formatPrice(row.original.invoiceSum) }} kr
              </UBadge>
              <UBadge v-else color="error" variant="subtle" :size="SIZES.small">
                <UIcon :name="ICONS.robotDead" :class="SIZES.smallBadgeIcon"/>
                {{ formatPrice(row.original.invoiceSum) }} kr ≠ {{ formatPrice(row.original.totalAmount) }} kr
              </UBadge>
            </template>
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
              <!-- VIRTUAL ROW: Current period transactions grouped by dinner -->
              <template v-if="row.original.isVirtual">
                <div v-if="currentPeriodGrouped.length > 0" class="space-y-2">
                  <CostEntry
                      v-for="group in currentPeriodGrouped"
                      :key="group.dinnerEventId"
                      :entry="group"
                  >
                    <template #items="{ items }">
                      <CostLine
                          v-for="tx in items"
                          :key="tx.id"
                          :inhabitant-name="tx.inhabitant.name"
                          :ticket-type="tx.ticketType"
                          :amount="tx.amount"
                          :order-id="tx.orderId"
                          :history-order-id="historyOrderId"
                          compact
                          @toggle-history="toggleHistory"
                      />
                    </template>
                  </CostEntry>
                </div>
                <UAlert
                    v-else
                    :icon="ICONS.robotHappy"
                    color="neutral"
                    variant="subtle"
                    title="Tomt her!"
                    description="Ingen transaktioner i denne periode endnu."
                />
              </template>

              <!-- CLOSED ROW: Invoice list (nested UTable) with expandable transactions -->
              <template v-else>
                <Loader v-if="isBillingPeriodDetailLoading" text="Henter fakturadetaljer..."/>

                <template v-else-if="selectedBillingPeriodDetail">
                  <!-- Nested UTable for invoices -->
                  <UTable
                      v-model:expanded="expandedInvoiceRows"
                      :data="selectedBillingPeriodDetail.invoices"
                      :columns="invoiceColumns"
                      :ui="COMPONENTS.table.ui"
                      row-key="id"
                  >
                    <template #expand-cell="{ row }">
                      <UButton
                          color="neutral"
                          variant="ghost"
                          :icon="row.getIsExpanded() ? ICONS.chevronDown : ICONS.chevronRight"
                          square
                          :size="SIZES.small"
                          aria-label="Vis transaktioner"
                          @click="row.toggleExpanded(); loadedInvoiceId = row.original.id; loadInvoiceTransactions(row.original.id)"
                      />
                    </template>
                    <template #pbsId-cell="{ row }">{{ row.original.pbsId }}</template>
                    <template #address-cell="{ row }">{{ row.original.address }}</template>
                    <template #amount-cell="{ row }">{{ formatPrice(row.original.amount) }} kr</template>
                    <template #control-cell="{ row }">
                      <span v-if="!getInvoiceControl(row.original.id)" class="text-neutral-400">—</span>
                      <span v-else-if="getInvoiceControl(row.original.id)?.isValid" class="text-success-600 dark:text-success-400 flex items-center gap-1">
                        <UIcon :name="ICONS.robotHappy" :class="SIZES.smallBadgeIcon"/>
                        {{ formatPrice(getInvoiceControl(row.original.id)!.computed) }} kr
                      </span>
                      <span v-else class="text-error-600 dark:text-error-400 flex items-center gap-1">
                        <UIcon :name="ICONS.robotDead" :class="SIZES.smallBadgeIcon"/>
                        {{ formatPrice(getInvoiceControl(row.original.id)!.computed) }} kr
                      </span>
                    </template>

                    <!-- Expanded invoice: transactions grouped by dinner -->
                    <template #expanded>
                      <div class="p-3 bg-white dark:bg-neutral-950">
                        <Loader v-if="isInvoiceTransactionsLoading" text="Henter transaktioner..."/>
                        <div v-else-if="invoiceTransactionsGrouped.length > 0" class="space-y-2">
                          <CostEntry
                              v-for="group in invoiceTransactionsGrouped"
                              :key="group.dinnerEventId"
                              :entry="group"
                          >
                            <template #items="{ items }">
                              <CostLine
                                  v-for="tx in items"
                                  :key="tx.id"
                                  :inhabitant-name="tx.inhabitant.name"
                                  :ticket-type="tx.ticketType"
                                  :amount="tx.amount"
                                  :order-id="tx.orderId"
                                  :history-order-id="historyOrderId"
                                  compact
                                  @toggle-history="toggleHistory"
                              />
                            </template>
                          </CostEntry>
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
