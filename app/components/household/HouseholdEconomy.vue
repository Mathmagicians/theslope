<script setup lang="ts">
/**
 * HouseholdEconomy - Billing view for household (Økonomi tab)
 *
 * Two sections (unified pattern matching AdminEconomy):
 * - Kommende: upcoming orders (BOOKED/RELEASED for future dinners)
 * - Faktureringsperioder: unified table with virtual (current) + closed (past) periods
 *
 * Uses EconomyTable for tables, CostEntry/CostLine for grouped items.
 * Data: billing and upcoming orders from bookingsStore, dinnerEvents from planStore
 */
import {addDays} from 'date-fns'
import {formatDate, createDateRange, formatDateRange} from '~/utils/date'
import type {DateRange} from '~/types/dateTypes'
import type {TransactionDisplay, CostEntry} from '~/composables/useBillingValidation'
import type {OrderDisplay, DinnerEventInfo} from '~/composables/useBookingValidation'
import type {StatBox} from '~/components/economy/CostEntry.vue'
import type {HouseholdDetail} from '~/composables/useCoreValidation'

interface Props {
    household: HouseholdDetail
}

const props = defineProps<Props>()

const {formatPrice} = useTicket()
const {groupByCostEntry, calculateCurrentBillingPeriod, formatTicketCounts} = useBilling()
const now = useClock()
const {ICONS, SIZES, TYPOGRAPHY, COMPONENTS, ALERTS, COLOR, TEXT, BG, NOISE} = useTheSlopeDesignSystem()

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
const {isSelectedSeasonInitialized} = storeToRefs(planStore)

const bookingsStore = useBookingsStore()
const {
    upcomingOrders: orders,
    isUpcomingOrdersLoading: isOrdersLoading,
    householdBilling: billing,
    householdBillingError: error,
    isHouseholdBillingLoading: isLoading,
    isHouseholdBillingErrored: isErrored
} = storeToRefs(bookingsStore)
bookingsStore.loadHouseholdBilling()
bookingsStore.loadUpcomingOrders(false)
const isUpcomingOrdersLoading = computed(() => isOrdersLoading.value || !isSelectedSeasonInitialized.value)

const inhabitantsMap = computed(() => new Map(props.household.inhabitants.map(i => [i.id, i.name])))
const getInhabitantName = (id: number) => inhabitantsMap.value.get(id) ?? `#${id}`

type OrderWithContext = OrderDisplay & { dinnerEvent: DinnerEventInfo, inhabitant: { id: number, name: string } }

const groupOrdersByDinner = groupByCostEntry<OrderWithContext>()
const upcomingOrdersData = computed(() => {
    return groupOrdersByDinner(
        orders.value
            .filter((o): o is OrderDisplay & { dinnerEvent: DinnerEventInfo } =>
                isPendingOrder(o) &&
                o.dinnerEvent !== undefined
            )
            .map(o => ({
                ...o,
                inhabitant: { id: o.inhabitantId, name: getInhabitantName(o.inhabitantId) }
            })),
        o => o.priceAtBooking
    )
})

const groupTxByDinner = groupByCostEntry<TransactionDisplay>()

const currentPeriodData = computed(() =>
    billing.value ? groupTxByDinner(billing.value.currentPeriod.transactions, tx => tx.amount) : []
)

// A row of the period table: the current period, not yet billed (virtual), or a past invoice
interface UnifiedBillingPeriod {
    id: number | 'virtual'      // 'virtual' for current period, number for past invoices
    period: DateRange           // For EconomyTable date filtering/sorting
    billingPeriod: string
    totalAmount: number
    dinnerCount: number
    ticketCounts: string
    isClosed: boolean           // true = past invoice, false = virtual/current
    groups: CostEntry<TransactionDisplay, DinnerEventInfo>[]
    transactionSum: number      // Control sum: Σ transaction amounts
}

const unifiedBillingPeriods = computed((): UnifiedBillingPeriod[] => {
    if (!billing.value) return []

    const periods: UnifiedBillingPeriod[] = []

    const currentPeriod = billing.value.currentPeriod
    const currentPeriodRange = createDateRange(currentPeriod.periodStart, currentPeriod.periodEnd)
    const currentGroups = currentPeriodData.value

    const virtualTransactionSum = sumAmounts(currentPeriod.transactions)

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

    for (const inv of billing.value.pastInvoices) {
        const groups = groupTxByDinner(inv.transactions, tx => tx.amount)
        const invoiceTransactionSum = sumAmounts(inv.transactions)
        periods.push({
            id: inv.id,
            period: createDateRange(inv.cutoffDate, inv.paymentDate),
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

const periodColumns = [
    {id: 'expand'},
    {accessorKey: 'status', header: 'Status'},
    {accessorKey: 'billingPeriod', header: 'Periode'},
    {accessorKey: 'ticketCounts', header: 'Kuverter'},
    {accessorKey: 'totalAmount', header: 'Beløb'},
    {accessorKey: 'control', header: 'Kontrol'}
]

const historyOrderId = ref<number | null>(null)
const toggleHistory = (orderId: number | null) => {
    historyOrderId.value = historyOrderId.value === orderId ? null : orderId
}

const dinnerColumns = [
    {id: 'expand'},
    {accessorKey: 'date', header: 'Dato'},
    {accessorKey: 'dinnerEvent.menuTitle', header: 'Menu'},
    {accessorKey: 'ticketCounts', header: 'Kuverter'},
    {accessorKey: 'totalAmount', header: 'Beløb'}
]

// Every upcoming order counts: the table's search filters only the rows it shows
const upcomingTotal = computed(() =>
    upcomingOrdersData.value.reduce((sum, g) => sum + g.totalAmount, 0)
)

const upcomingPeriodStart = computed(() => addDays(calculateCurrentBillingPeriod(now.value).end, 1))
</script>

<template>
  <div data-testid="household-economy" :class="COMPONENTS.adminEconomy.page">
    <ViewError v-if="isErrored" :error="error?.statusCode" message="Kunne ikke hente økonomioversigt"/>
    <Loader v-else-if="isLoading" text="Henter økonomioversigt..."/>

    <template v-else-if="billing">
      <UCard>
        <template #header>
          <div :class="COMPONENTS.adminEconomy.cardTitleRow">
            <UIcon :name="ICONS.calendar" :size="SIZES.standardIconSize"/>
            <div :class="COMPONENTS.householdEconomy.titleStack">
              <h3 :class="TYPOGRAPHY.cardTitle">Kommende</h3>
              <span :class="[COMPONENTS.pipe, COMPONENTS.householdEconomy.titlePipe, TEXT.gray[400]]">|</span>
              <p :class="TYPOGRAPHY.bodyTextMuted">{{ formatDate(upcomingPeriodStart) }} → ...</p>
            </div>
          </div>
        </template>

        <EconomyTable
            :data="upcomingOrdersData"
            :columns="dinnerColumns"
            :get-row-id="dinnerRowIdOf"
            :date-accessor="(item) => item.dinnerEvent.date"
            :loading="isUpcomingOrdersLoading"
        >
          <template #expand-cell="{ row }">
            <UButton
                v-if="row.original.items.length > 0"
                :color="COLOR.neutral"
                :variant="NOISE.quiet"
                :icon="row.getIsExpanded() ? ICONS.chevronDown : ICONS.chevronRight"
                square
                :size="SIZES.small"
                aria-label="Vis detaljer"
                @click="row.toggleExpanded()"
            />
          </template>
          <template #totalAmount-cell="{ row }">{{ formatPrice(row.original.totalAmount) }} kr</template>
          <template #expanded="{ row }">
            <UCard :class="COMPONENTS.householdEconomy.expandedCard">
              <div :class="COMPONENTS.householdEconomy.orderList">
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
                v-bind="ALERTS.neutral"
                title="Ingen kommende bestillinger"
                description="Du har ikke booket nogen middage endnu - hop over til Tilmeldinger!"
            />
          </template>
        </EconomyTable>

        <template v-if="upcomingOrdersData.length > 0" #footer>
          <div :class="COMPONENTS.adminEconomy.totalRow">
            <span :class="TYPOGRAPHY.bodyTextMedium">Forventet:</span>
            <span :class="TYPOGRAPHY.cardTitle">{{ formatPrice(upcomingTotal) }} kr</span>
          </div>
        </template>
      </UCard>

      <UCard>
        <template #header>
          <div :class="COMPONENTS.adminEconomy.cardTitleRow">
            <UIcon :name="ICONS.economy" :size="SIZES.standardIconSize"/>
            <h3 :class="TYPOGRAPHY.cardTitle">Faktureringsperioder</h3>
          </div>
        </template>

        <EconomyTable
            :data="unifiedBillingPeriods"
            :columns="periodColumns"
            :get-row-id="rowIdOf"
            :date-accessor="(item) => item.period.start"
            search-placeholder="Søg periode..."
            :default-sort-desc="true"
        >
          <template #expand-cell="{ row }">
            <UButton
                v-if="row.original.groups.length > 0"
                :color="COLOR.neutral"
                :variant="NOISE.quiet"
                :icon="row.getIsExpanded() ? ICONS.chevronDown : ICONS.chevronRight"
                square
                :size="SIZES.small"
                aria-label="Vis detaljer"
                @click="row.toggleExpanded()"
            />
          </template>
          <template #status-cell="{ row }">
            <UBadge v-if="!row.original.isClosed" :color="COLOR.success" :variant="NOISE.subtle" :size="SIZES.small">
              <UIcon :name="ICONS.ellipsisCircle" :class="SIZES.smallBadgeIcon"/>
              Igangværende
            </UBadge>
            <UBadge v-else :color="COLOR.neutral" :variant="NOISE.subtle" :size="SIZES.small">
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
                :class="COMPONENTS.householdEconomy.expandedCard"
            >
              <template #default="{ items }">
                <UTable
                    :data="items"
                    :columns="dinnerColumns"
                    :ui="{...COMPONENTS.table.ui, thead: COMPONENTS.economyTable.level1.tableHead}"
                    :get-row-id="dinnerRowIdOf"
                >
                  <template #expand-cell="{ row: dinnerRow }">
                    <UButton
                        v-if="dinnerRow.original.items.length > 0"
                        :color="COLOR.neutral"
                        :variant="NOISE.quiet"
                        :icon="dinnerRow.getIsExpanded() ? ICONS.chevronDown : ICONS.chevronRight"
                        square
                        :size="SIZES.small"
                        aria-label="Vis ordrer"
                        @click="dinnerRow.toggleExpanded()"
                    />
                  </template>
                  <template #date-cell="{ row: dinnerRow }">{{ formatDate(dinnerRow.original.dinnerEvent.date) }}</template>
                  <template #totalAmount-cell="{ row: dinnerRow }">{{ formatPrice(dinnerRow.original.totalAmount) }} kr</template>

                  <template #expanded="{ row: dinnerRow }">
                    <div :class="[COMPONENTS.adminEconomy.nestedList, BG.panel]">
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
                v-bind="ALERTS.neutral"
                title="Ingen faktureringsperioder"
                description="Der er ingen transaktioner endnu - PBS-robotten sover stadig!"
            />
          </template>
        </EconomyTable>
      </UCard>
    </template>

    <UAlert
        v-else
        v-bind="ALERTS.warning"
        title="Ingen data"
        description="Kunne ikke hente økonomioversigt."
    />
  </div>
</template>
