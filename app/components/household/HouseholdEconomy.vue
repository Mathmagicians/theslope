<script setup lang="ts">
/**
 * HouseholdEconomy - Billing view for household (Økonomi tab)
 *
 * Three sections:
 * - Kommende: upcoming orders (BOOKED/RELEASED for future dinners)
 * - Igangværende periode (Ikke faktureret): current billing period transactions
 * - Tidligere perioder (Faktureret): past invoices with grouped transactions
 *
 * Uses CostEntry/CostLine components for DRY display of grouped items.
 * Data: GET /api/billing?householdId=X + orders from bookingsStore + dinnerEvents from planStore
 */
import {formatDate} from '~/utils/date'
import type {HouseholdBillingResponse, TransactionDisplay} from '~/composables/useBillingValidation'
import type {OrderDisplay} from '~/composables/useBookingValidation'

interface Props {
    household: {id: number}
}

const props = defineProps<Props>()

// Composables
const {formatPrice} = useTicket()
const {groupByCostEntry, joinOrdersWithDinnerEvents} = useBilling()
const {COMPONENTS, ICONS, SIZES, TYPOGRAPHY} = useTheSlopeDesignSystem()
const {OrderStateSchema} = useBookingValidation()

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
    {default: () => null}
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

    return groupByCostEntry(ordersWithDinner, o => o.dinnerEvent, o => o.priceAtBooking)
})

// Transaction accessors for groupByCostEntry
const txDinner = (tx: TransactionDisplay) => tx.dinnerEvent
const txAmount = (tx: TransactionDisplay) => tx.amount

// Current period grouped data
const currentPeriodData = computed(() =>
    billing.value ? groupByCostEntry(billing.value.currentPeriod.transactions, txDinner, txAmount) : []
)

// Past invoices with pre-grouped transactions
interface InvoiceRow {
    id: number
    billingPeriod: string
    amount: number
    paymentMonth: string
    groups: CostEntry<TransactionDisplay>[]
}

const pastInvoicesData = computed((): InvoiceRow[] =>
    billing.value?.pastInvoices.map(inv => ({
        id: inv.id,
        billingPeriod: inv.billingPeriod.replace('-', ' - '),
        amount: inv.amount,
        paymentMonth: formatDate(new Date(inv.paymentDate), 'MMMM yyyy'),
        groups: groupByCostEntry(inv.transactions, txDinner, txAmount)
    })) ?? []
)

// Single-expansion for tables
const {expanded: expandedUpcoming} = useExpandableRow()
const {expanded: expandedCurrent} = useExpandableRow()
const {expanded: expandedInvoice} = useExpandableRow()

// Single history visible at a time
const historyOrderId = ref<number | null>(null)
const toggleHistory = (orderId: number | null) => {
    historyOrderId.value = historyOrderId.value === orderId ? null : orderId
}

// Table columns (shared for upcoming and current period)
const dinnerColumns = [
    {id: 'expand'},
    {accessorKey: 'date', header: 'Dato'},
    {accessorKey: 'menuTitle', header: 'Menu'},
    {accessorKey: 'ticketCounts', header: 'Kuverter'},
    {accessorKey: 'totalAmount', header: 'Beløb'}
]

const columns = {
    upcoming: dinnerColumns,
    current: dinnerColumns,
    invoice: [
        {id: 'expand'},
        {accessorKey: 'billingPeriod', header: 'Forbrugsperiode'},
        {accessorKey: 'amount', header: 'Beløb'},
        {accessorKey: 'paymentMonth', header: 'PBS opkrævet'}
    ]
}

// Totals
const upcomingTotal = computed(() =>
    upcomingOrdersData.value.reduce((sum, g) => sum + g.totalAmount, 0)
)
</script>

<template>
  <div data-testid="household-economy" class="space-y-6">
    <ViewError v-if="isErrored" :error="error?.statusCode" message="Kunne ikke hente økonomioversigt"/>
    <Loader v-else-if="isLoading" text="Henter økonomioversigt..."/>

    <template v-else-if="billing">
      <!-- Kommende (Upcoming Orders) -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon :name="ICONS.calendar" :size="SIZES.standardIconSize"/>
            <h3 :class="TYPOGRAPHY.cardTitle">Kommende</h3>
          </div>
        </template>

        <UTable
            v-model:expanded="expandedUpcoming"
            :data="upcomingOrdersData"
            :columns="columns.upcoming"
            :ui="COMPONENTS.table.ui"
            :loading="isOrdersLoading"
            row-key="dinnerEventId"
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
          <template #date-cell="{ row }">{{ formatDate(row.original.date) }}</template>
          <template #totalAmount-cell="{ row }">{{ formatPrice(row.original.totalAmount) }} kr</template>
          <template #expanded="{ row }">
            <div class="p-4 bg-neutral-50 dark:bg-neutral-900 space-y-2">
              <EconomyCostLine
                  v-for="order in row.original.items"
                  :key="order.id"
                  :inhabitant-name="order.inhabitant.name"
                  :ticket-type="order.ticketType"
                  :amount="order.priceAtBooking"
                  :order-id="order.id"
                  :history-order-id="historyOrderId"
                  @toggle-history="toggleHistory"
              />
            </div>
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
        </UTable>

        <template v-if="upcomingOrdersData.length > 0" #footer>
          <div class="flex justify-end items-center gap-2">
            <span :class="TYPOGRAPHY.bodyTextMedium">Forventet:</span>
            <span :class="TYPOGRAPHY.cardTitle">{{ formatPrice(upcomingTotal) }} kr</span>
          </div>
        </template>
      </UCard>

      <!-- Igangværende periode (Ikke faktureret) -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon :name="ICONS.shoppingCart" :size="SIZES.standardIconSize"/>
            <div>
              <h3 :class="TYPOGRAPHY.cardTitle">Aktuel periode</h3>
              <p :class="TYPOGRAPHY.bodyTextMuted">
                {{ formatDate(billing.currentPeriod.periodStart) }} -
                {{ formatDate(billing.currentPeriod.periodEnd) }}
              </p>
            </div>
          </div>
        </template>

        <UTable
            v-if="currentPeriodData.length > 0"
            v-model:expanded="expandedCurrent"
            :data="currentPeriodData"
            :columns="columns.current"
            :ui="COMPONENTS.table.ui"
            row-key="dinnerEventId"
        >
          <template #expand-cell="{ row }">
            <UButton
                color="neutral"
                variant="ghost"
                :icon="row.getIsExpanded() ? ICONS.chevronDown : ICONS.chevronRight"
                square
                :size="SIZES.small"
                aria-label="Vis detaljer"
                @click="row.toggleExpanded()"
            />
          </template>
          <template #date-cell="{ row }">{{ formatDate(row.original.date) }}</template>
          <template #totalAmount-cell="{ row }">{{ formatPrice(row.original.totalAmount) }} kr</template>
          <template #expanded="{ row }">
            <div class="p-4 bg-neutral-50 dark:bg-neutral-900 space-y-2">
              <EconomyCostLine
                  v-for="tx in row.original.items"
                  :key="tx.id"
                  :inhabitant-name="tx.inhabitant.name"
                  :ticket-type="tx.ticketType"
                  :amount="tx.amount"
                  :order-id="tx.orderId"
                  :history-order-id="historyOrderId"
                  @toggle-history="toggleHistory"
              />
            </div>
          </template>
        </UTable>
        <p v-else :class="[TYPOGRAPHY.bodyTextMuted, 'py-4']">Ingen transaktioner i denne periode</p>

        <template #footer>
          <div class="flex justify-end items-center gap-2">
            <span :class="TYPOGRAPHY.bodyTextMedium">Total:</span>
            <span :class="TYPOGRAPHY.cardTitle">{{ formatPrice(billing.currentPeriod.totalAmount) }} kr</span>
          </div>
        </template>
      </UCard>

      <!-- Past Invoices -->
      <UCard v-if="pastInvoicesData.length > 0">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon :name="ICONS.clock" :size="SIZES.standardIconSize"/>
            <h3 :class="TYPOGRAPHY.cardTitle">Tidligere perioder</h3>
          </div>
        </template>

        <UTable
            v-model:expanded="expandedInvoice"
            :data="pastInvoicesData"
            :columns="columns.invoice"
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
                aria-label="Vis detaljer"
                @click="row.toggleExpanded()"
            />
          </template>
          <template #amount-cell="{ row }">{{ formatPrice(row.original.amount) }} kr</template>
          <template #expanded="{ row }">
            <div class="p-4 bg-neutral-50 dark:bg-neutral-900 space-y-2">
              <EconomyCostEntry
                  v-for="group in row.original.groups"
                  :key="group.dinnerEventId"
                  :entry="group"
              >
                <template #items="{ items }">
                  <EconomyCostLine
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
              </EconomyCostEntry>
            </div>
          </template>
        </UTable>
      </UCard>

      <UAlert
          v-else
          :icon="ICONS.clock"
          color="neutral"
          variant="subtle"
          title="Ingen tidligere perioder"
          description="Der er endnu ikke afsluttede faktureringsperioder."
      />
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
