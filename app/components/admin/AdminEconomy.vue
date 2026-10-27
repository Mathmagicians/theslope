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
import {formatDate, formatDateRange, parseDate} from '~/utils/date'
import type {DateRange} from '~/types/dateTypes'
import type {TransactionDisplay, CostEntry, InhabitantInfo, HouseholdEntry} from '~/composables/useBillingValidation'
import type {OrderDisplay, DesiredOrder, DinnerEventDisplay, DinnerEventInfo} from '~/composables/useBookingValidation'
import type {StatBox} from '~/components/economy/CostEntry.vue'
import type {SeasonDeadlines} from '~/composables/useSeason'
import type {HouseholdDetail} from '~/composables/useCoreValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import type {TableData, TableRow} from '@nuxt/ui'

const props = withDefaults(defineProps<{
  canEdit?: boolean
}>(), {
  canEdit: false
})

const {formatPrice} = useTicket()
const {groupByCostEntry, groupByHouseholdEntry, calculateCurrentBillingPeriod, controlInvoices, formatTicketCounts} = useBilling()
const now = useClock()
const {ICONS, SIZES, TYPOGRAPHY, COMPONENTS, ALERTS, COLOR, TEXT, BG, BORDER, NOISE} = useTheSlopeDesignSystem()

const planStore = usePlanStore()
const {selectedSeason, isPlanStoreReady} = storeToRefs(planStore)

const householdsStore = useHouseholdsStore()
const {households} = storeToRefs(householdsStore)

const allInhabitants = computed(() =>
    households.value.flatMap(h => h.inhabitants)
)

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

// ?period= and ?invoice= carry the expanded billing period and invoice (ADR-006)
const useIdParam = (key: string) => useQueryParam<number | null>(key, {
    serialize: (id) => id === null ? '' : String(id),
    deserialize: (s) => {
        const parsed = parseInt(s, 10)
        return Number.isNaN(parsed) ? null : parsed
    },
    normalize: (id) => id,
    defaultValue: null
})
const {value: periodParam, setValue: setPeriodParam} = useIdParam('period')
const {value: invoiceParam, setValue: setInvoiceParam} = useIdParam('invoice')
bookingsStore.selectBillingPeriod(periodParam)
bookingsStore.selectInvoice(invoiceParam)

// Opening a row selects it; closing the selected row clears the param
const toggleSelection = <Row extends TableData>(row: TableRow<Row>, id: number, selected: number | null, select: (id: number | null) => Promise<void>) => {
    const isOpening = !row.getIsExpanded()
    row.toggleExpanded()
    if (isOpening) select(id)
    else if (selected === id) select(null)
}

const dinnerEvents = computed(() => selectedSeason.value?.dinnerEvents ?? [])

const inhabitantsMap = computed(() => new Map(allInhabitants.value.map(i => [i.id, i.name])))
const getInhabitantName = (id: number) => inhabitantsMap.value.get(id) ?? `#${id}`

const {getHouseholdForInhabitant} = householdsStore

const {upcomingOrders, isUpcomingOrdersLoaded} = storeToRefs(bookingsStore)
bookingsStore.loadUpcomingOrders(true)
// Loading until the upcoming orders have answered: a dataset idle in the server render reads as loading, not empty
const isUpcomingOrdersLoading = computed(() =>
    !isPlanStoreReady.value || !isUpcomingOrdersLoaded.value
)

type OrderWithInhabitant = OrderDisplay & { inhabitant: InhabitantInfo, dinnerEvent: DinnerEventInfo }
const upcomingOrdersEnriched = computed((): OrderWithInhabitant[] =>
    upcomingOrders.value
        .filter((o): o is OrderDisplay & { dinnerEvent: DinnerEventInfo } => o.dinnerEvent !== undefined)
        .map(o => ({
            ...o,
            inhabitant: {
                id: o.inhabitantId,
                name: getInhabitantName(o.inhabitantId),
                household: getHouseholdForInhabitant(o.inhabitantId) ?? {id: 0, pbsId: 0, address: 'Ukendt'}
            }
        }))
)
const groupOrdersByDinner = groupByCostEntry<OrderWithInhabitant>()
const upcomingOrdersGrouped = computed(() =>
    groupOrdersByDinner(upcomingOrdersEnriched.value, o => o.priceAtBooking)
)

const groupOrdersByHousehold = groupByHouseholdEntry<OrderWithInhabitant>(o => o.inhabitant.household)
const upcomingOrdersTotal = computed(() =>
    upcomingOrdersEnriched.value.reduce((sum, o) => sum + o.priceAtBooking, 0)
)

const dinnerColumns = [
    {id: 'expand'},
    {accessorKey: 'date', header: 'Dato'},
    {accessorKey: 'dinnerEvent.menuTitle', header: 'Menu'},
    {accessorKey: 'ticketCounts', header: 'Kuverter'},
    {accessorKey: 'totalAmount', header: 'Beløb'}
]

const householdOrderColumns = [
    {id: 'expand'},
    {accessorKey: 'address', header: 'Adresse'},
    {accessorKey: 'ticketCounts', header: 'Kuverter'},
    {accessorKey: 'totalAmount', header: 'Beløb'}
]

const sortByAddress = <T extends { address: string }>(entries: T[]): T[] =>
    [...entries].sort((a, b) => a.address.localeCompare(b.address, 'da'))

const householdSearchQueries = ref<Map<number, string>>(new Map())
const getHouseholdSearch = (dinnerEventId: number): string =>
    householdSearchQueries.value.get(dinnerEventId) ?? ''
const setHouseholdSearch = (dinnerEventId: number, query: string) => {
    householdSearchQueries.value.set(dinnerEventId, query)
}

const filterHouseholds = (entries: HouseholdEntry<OrderWithInhabitant>[], query: string): HouseholdEntry<OrderWithInhabitant>[] => {
    if (!query) return entries
    const q = query.toLowerCase()
    return entries.filter(entry =>
        entry.address.toLowerCase().includes(q) ||
        entry.items.some(order => order.inhabitant.name.toLowerCase().includes(q))
    )
}

const futureDinnerStatsAccessor = (entry: CostEntry<OrderWithInhabitant, DinnerEventInfo>): StatBox[] => {
    const households = new Set(entry.items.map(o => o.inhabitant.household.id))
    return [
        {icon: ICONS.household, value: households.size, label: 'Husstande'},
        {icon: ICONS.dinner, value: formatTicketCounts(entry.items), label: 'Kuverter'},
        {icon: ICONS.shoppingCart, value: `${formatPrice(entry.items.reduce((sum, o) => sum + o.priceAtBooking, 0))} kr`, label: 'Total'}
    ]
}

const currentPeriod = computed(() => calculateCurrentBillingPeriod(now.value))

const groupTxByDinner = groupByCostEntry<TransactionDisplay>()

const groupTxByHousehold = groupByHouseholdEntry<TransactionDisplay>(tx => tx.inhabitant.household)

// The current period's virtual invoices: one per household, as a closed period lists its invoices
const currentPeriodByHousehold = computed(() =>
    groupTxByHousehold(currentPeriodTransactions.value, tx => tx.amount)
)

const currentPeriodGrouped = computed(() =>
    groupTxByDinner(currentPeriodTransactions.value, tx => tx.amount)
)

const invoiceTransactionsGrouped = computed(() =>
    groupTxByDinner(selectedInvoiceTransactions.value, tx => tx.amount)
)

const currentPeriodTotal = computed(() =>
    sumAmounts(currentPeriodTransactions.value)
)

const currentPeriodHouseholdCount = computed(() => {
    const householdIds = new Set(currentPeriodTransactions.value.map(tx => tx.inhabitant.household.id))
    return householdIds.size
})

// A row of the period table: the current period, billed at the next PBS run (virtual), or a closed period
interface UnifiedBillingPeriod {
    id: number | 'virtual'
    isVirtual: boolean
    period: DateRange           // Forbrugsperiode
    cutoffDate: Date | null     // Opgørelsesdato (null for virtual)
    paymentDate: Date | null    // PBS opkræves (null for virtual)
    householdCount: number
    dinnerCount: number
    ticketCounts: string        // "2V 1B" format
    totalAmount: number
    invoiceSum: number | null   // Σ invoice.amount for control sum (null for virtual)
    shareToken?: string
}

const billingPeriodTitleAccessor = () => 'Samlet PBS Afregning'
const virtualPeriodTitleAccessor = () => 'Næste PBS'
const periodSubtitleAccessor = (period: UnifiedBillingPeriod) => formatDateRange(period.period)
const periodStatsAccessor = (period: UnifiedBillingPeriod): StatBox[] => [
    {icon: ICONS.household, value: period.householdCount, label: 'Husstande'},
    {icon: ICONS.calendar, value: period.dinnerCount, label: 'Middage'},
    {icon: ICONS.dinner, value: period.ticketCounts, label: 'Kuverter'},
    {icon: ICONS.shoppingCart, value: `${formatPrice(period.totalAmount)} kr`, label: 'Total'}
]

const virtualInvoiceColumns = [
    {id: 'expand'},
    {accessorKey: 'pbsId', header: 'PBS'},
    {accessorKey: 'address', header: 'Adresse'},
    {accessorKey: 'totalAmount', header: 'Beløb'},
    {accessorKey: 'control', header: 'Kontrol'}
]

const unifiedBillingPeriods = computed((): UnifiedBillingPeriod[] => {
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
        invoiceSum: null
    }

    // billingPeriod reads "dd/MM/yyyy-dd/MM/yyyy" (formatDateRange)
    const closedRows: UnifiedBillingPeriod[] = billingPeriods.value.map(bp => {
        const [start = '', end = ''] = bp.billingPeriod.split('-')
        return {
            id: bp.id,
            isVirtual: false,
            period: {start: parseDate(start), end: parseDate(end)},
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

    return [virtualRow, ...closedRows]
})

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

const invoiceColumns = [
    {id: 'expand'},
    {accessorKey: 'pbsId', header: 'PBS'},
    {accessorKey: 'address', header: 'Adresse'},
    {accessorKey: 'amount', header: 'Beløb'},
    {accessorKey: 'control', header: 'Kontrol'}
]

const {expanded: expandedInvoiceRows} = useExpandableRow()

const billingPeriodControlSum = computed(() => {
    if (!selectedBillingPeriodDetail.value) return null
    return controlInvoices(selectedBillingPeriodDetail.value.invoices, selectedBillingPeriodDetail.value.totalAmount)
})

const historyOrderId = ref<number | null>(null)
const toggleHistory = (orderId: number | null) => {
    historyOrderId.value = historyOrderId.value === orderId ? null : orderId
}

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

type HouseholdOption = { label: string; value: number }
const householdOptions = computed((): HouseholdOption[] =>
    households.value.map(h => ({
        label: `${h.address} · PBS ${h.pbsId}`,
        value: h.id
    }))
)

// USelectMenu reads undefined, not null, as no selection
const selectedHouseholdOption = computed({
    get: () => householdOptions.value.find(o => o.value === editingHouseholdId.value),
    set: async (option: HouseholdOption | undefined) => {
        editingHouseholdId.value = option?.value ?? null
        editingHousehold.value = null
        // DinnerBookingForm takes the household's detail
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

// An admin's correction lifts every deadline (ADR-016)
const adminDeadlines: SeasonDeadlines = {
    getDinnerStartTime: (date: Date) => date,
    getMenuDeadlineTime: (date: Date) => date,
    getBookingDeadlineTime: (date: Date) => date,
    getDiningModeDeadlineTime: (date: Date) => date,
    canModifyOrders: () => true,
    canEditDiningMode: () => true,
    getOrderCancellationAction: () => null,
    isAnnounceMenuPastDeadline: () => false
}

const editingDinnerEvent = computed((): DinnerEventDisplay | null => {
    if (!editingDinnerId.value) return null
    return dinnerEvents.value.find(e => e.id === editingDinnerId.value) ?? null
})

const editingOrders = computed((): OrderDisplay[] => {
    if (!editingDinnerId.value || !editingHouseholdId.value) return []
    return upcomingOrders.value.filter(o =>
        o.dinnerEventId === editingDinnerId.value &&
        getHouseholdForInhabitant(o.inhabitantId)?.id === editingHouseholdId.value
    )
})

const ticketPrices = computed((): TicketPrice[] =>
    selectedSeason.value?.ticketPrices ?? []
)

const toast = useToast()
const {processAdminCorrection} = bookingsStore

const handleAdminSave = async (orders: DesiredOrder[]) => {
    if (!editingDinnerId.value || !editingHouseholdId.value || !editingDinnerEvent.value || !editingHousehold.value) return
    const guestBookerInhabitantId = editingHousehold.value.inhabitants[0]?.id
    const result = await processAdminCorrection(
        editingHouseholdId.value,
        editingDinnerId.value,
        orders,
        guestBookerInhabitantId
    )
    const reported = scaffoldToast('Administrator Korrektion', result, editingHousehold.value.inhabitants.map(({id}) => id))
    toast.add({...reported, description: `${editingHousehold.value.address}\n${reported.description}`})
    cancelEditing()
}

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
  <div data-testid="admin-economy" :class="COMPONENTS.adminEconomy.page">
    <ViewError v-if="isBillingPeriodsErrored" :error="billingPeriodsError?.statusCode" message="Kunne ikke hente økonomioversigt"/>

    <template v-else>
      <UCard>
        <template #header>
          <div :class="COMPONENTS.adminEconomy.cardTitleRow">
            <UIcon :name="ICONS.shoppingCart" :size="SIZES.standardIconSize"/>
            <h3 :class="TYPOGRAPHY.cardTitle">Fremtidige bestillinger</h3>
          </div>
        </template>

        <EconomyTable
            :data="upcomingOrdersGrouped"
            :columns="dinnerColumns"
            :get-row-id="dinnerRowIdOf"
            :date-accessor="(item) => item.dinnerEvent.date"
            :loading="isUpcomingOrdersLoading"
            loading-text="Henter fremtidige bestillinger"
            data-testid="future-orders-table"
        >
          <template #expand-cell="{ row }">
            <UButton
                v-if="row.original.items.length > 0"
                :color="COLOR.neutral"
                :variant="NOISE.quiet"
                :icon="row.getIsExpanded() ? ICONS.chevronDown : ICONS.chevronRight"
                square
                :size="SIZES.small"
                :data-testid="`future-orders-expand-${row.original.dinnerEvent.id}`"
                aria-label="Vis detaljer"
                @click="row.toggleExpanded()"
            />
          </template>
          <template #totalAmount-cell="{ row }">{{ formatPrice(row.original.totalAmount) }} kr</template>
          <template #expanded="{ row }">
            <div :class="[COMPONENTS.adminEconomy.panel, BG.panel]">
              <CostEntry
                  :entry="row.original"
                  :level="2"
                  :title-accessor="(e) => formatDate(e.dinnerEvent.date)"
                  :subtitle-accessor="(e) => e.dinnerEvent.menuTitle"
                  :stats-accessor="futureDinnerStatsAccessor"
              >
                <!-- div wrapper: the slot's content must be SSR-consistent -->
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
                        @confirm="startEditingDinner(row.original.dinnerEvent.id)"
                    />
                  </div>
                </template>
                <template #default>
                  <div v-if="editingDinnerId === row.original.dinnerEvent.id" :class="COMPONENTS.adminEconomy.correction">
                    <div :class="COMPONENTS.adminEconomy.correctionRow">
                      <label :class="TYPOGRAPHY.bodyTextMedium">Vælg husstand:</label>
                      <USelectMenu
                          v-model="selectedHouseholdOption"
                          :items="householdOptions"
                          placeholder="Vælg husstand..."
                          :class="COMPONENTS.adminEconomy.householdSelect"
                          data-testid="admin-correction-household-select"
                      />
                      <UButton
                          :color="COLOR.neutral"
                          :variant="NOISE.quiet"
                          :icon="ICONS.xMark"
                          :size="SIZES.small"
                          aria-label="Annuller"
                          @click="cancelEditing"
                      />
                    </div>

                    <div v-if="isLoadingHousehold" :class="[COMPONENTS.adminEconomy.loadingLine, TEXT.muted]">
                      <UIcon :name="ICONS.sync" :class="COMPONENTS.adminEconomy.loadingSpinner" />
                      <span>Henter husstand...</span>
                    </div>

                    <DinnerBookingForm
                        v-else-if="editingHousehold && editingDinnerEvent"
                        :household="editingHousehold"
                        :dinner-event="editingDinnerEvent"
                        :orders="editingOrders"
                        :ticket-prices="ticketPrices"
                        :deadlines="adminDeadlines"
                        :can-edit-admin-override="() => true"
                        admin-bypass
                        @save-bookings="handleAdminSave"
                        @cancel="cancelEditing"
                    />
                  </div>

                  <UTable
                      :data="filterHouseholds(sortByAddress(groupOrdersByHousehold(row.original.items, o => o.priceAtBooking)), getHouseholdSearch(row.original.dinnerEvent.id))"
                      :columns="householdOrderColumns"
                      :ui="COMPONENTS.table.ui"
                      :get-row-id="rowIdOf"
                  >
                    <template #address-header>
                      <UInput
                          :model-value="getHouseholdSearch(row.original.dinnerEvent.id)"
                          placeholder="Søg adresse eller navn..."
                          :trailing-icon="ICONS.search"
                          :size="SIZES.small"
                          @update:model-value="setHouseholdSearch(row.original.dinnerEvent.id, $event)"
                      />
                    </template>
                    <template #expand-cell="{ row: householdRow }">
                      <UButton
                          v-if="householdRow.original.items.length > 0"
                          :color="COLOR.neutral"
                          :variant="NOISE.quiet"
                          :icon="householdRow.getIsExpanded() ? ICONS.chevronDown : ICONS.chevronRight"
                          square
                          :size="SIZES.small"
                          aria-label="Vis ordrer"
                          @click="householdRow.toggleExpanded()"
                      />
                    </template>
                    <template #address-cell="{ row: householdRow }">{{ householdRow.original.address }} <span :class="TYPOGRAPHY.bodyTextMuted">· PBS {{ householdRow.original.pbsId }}</span></template>
                    <template #totalAmount-cell="{ row: householdRow }">{{ formatPrice(householdRow.original.totalAmount) }} kr</template>

                    <template #expanded="{ row: householdRow }">
                      <div :class="[COMPONENTS.adminEconomy.nestedList, BG.panelNested]">
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
                v-bind="ALERTS.neutral"
                title="Ingen fremtidige bestillinger"
                description="Der er ingen bookede middage i fremtiden endnu."
            />
          </template>
        </EconomyTable>

        <template v-if="upcomingOrdersGrouped.length > 0" #footer>
          <div :class="COMPONENTS.adminEconomy.totalRow">
            <span :class="TYPOGRAPHY.bodyTextMedium">Total:</span>
            <span :class="TYPOGRAPHY.cardTitle">{{ formatPrice(upcomingOrdersTotal) }} kr</span>
          </div>
        </template>
      </UCard>

      <UCard>
        <template #header>
          <div :class="COMPONENTS.adminEconomy.cardTitleRow">
            <UIcon :name="ICONS.clipboard" :size="SIZES.standardIconSize"/>
            <h3 :class="TYPOGRAPHY.cardTitle">Faktureringsperioder</h3>
          </div>
        </template>

        <EconomyTable
            :data="unifiedBillingPeriods"
            :columns="periodColumns"
            :get-row-id="rowIdOf"
            :date-accessor="(item) => item.period.start"
            search-placeholder="Søg periode..."
            :loading="isBillingPeriodsLoading || isCurrentPeriodLoading"
            :default-sort-desc="true"
        >
          <template #expand-cell="{ row }">
            <UButton
                :color="COLOR.neutral"
                :variant="NOISE.quiet"
                :icon="row.getIsExpanded() ? ICONS.chevronDown : ICONS.chevronRight"
                square
                :size="SIZES.small"
                aria-label="Vis detaljer"
                @click="row.original.isVirtual ? row.toggleExpanded() : toggleSelection(row, row.original.id as number, periodParam, setPeriodParam)"
            />
          </template>
          <template #status-cell="{ row }">
            <UBadge v-if="row.original.isVirtual" :color="COLOR.success" :variant="NOISE.subtle" :size="SIZES.small">
              <UIcon :name="ICONS.ellipsisCircle" :class="SIZES.smallBadgeIcon"/>
              Igangværende
            </UBadge>
            <UBadge v-else :color="COLOR.neutral" :variant="NOISE.subtle" :size="SIZES.small">
              <UIcon :name="ICONS.check" :class="SIZES.smallBadgeIcon"/>
              Afsluttet
            </UBadge>
          </template>
          <template #period-cell="{ row }">
            {{ formatDateRange(row.original.period) }}
          </template>
          <template #totalAmount-cell="{ row }">{{ formatPrice(row.original.totalAmount) }} kr</template>
          <template #control-cell="{ row }">
            <!-- The current period has no invoices to control yet -->
            <span v-if="row.original.isVirtual" :class="TEXT.neutral[400]">—</span>
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
            <span v-else :class="TEXT.neutral[400]">—</span>
          </template>

          <template #expanded="{ row }">
            <div :class="[COMPONENTS.adminEconomy.periodPanel, BG.panel]">
              <template v-if="row.original.isVirtual">
                <CostEntry
                    :entry="row.original"
                    :level="1"
                    :title-accessor="virtualPeriodTitleAccessor"
                    :subtitle-accessor="periodSubtitleAccessor"
                    :stats-accessor="periodStatsAccessor"
                >
                  <template #default>
                    <UTable
                        :data="currentPeriodByHousehold"
                        :columns="virtualInvoiceColumns"
                        :ui="COMPONENTS.table.ui"
                        :get-row-id="rowIdOf"
                    >
                      <template #expand-cell="{ row: householdRow }">
                        <UButton
                            v-if="householdRow.original.items.length > 0"
                            :color="COLOR.neutral"
                            :variant="NOISE.quiet"
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
                        <span :class="TEXT.neutral[400]">—</span>
                      </template>

                      <template #expanded="{ row: householdRow }">
                        <div :class="[COMPONENTS.adminEconomy.nestedList, BG.panelNested]">
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
                            v-bind="ALERTS.neutral"
                            title="Tomt her!"
                            description="Ingen transaktioner i denne periode endnu."
                        />
                      </template>
                    </UTable>
                  </template>
                </CostEntry>
              </template>

              <template v-else>
                <Loader v-if="isBillingPeriodDetailLoading" text="Henter fakturadetaljer..."/>

                <template v-else-if="selectedBillingPeriodDetail">
                  <CostEntry
                      :entry="row.original"
                      :level="1"
                      :title-accessor="billingPeriodTitleAccessor"
                      :subtitle-accessor="periodSubtitleAccessor"
                      :stats-accessor="periodStatsAccessor"
                  >
                    <template #default>
                      <UTable
                        v-model:expanded="expandedInvoiceRows"
                        :data="selectedBillingPeriodDetail.invoices"
                        :columns="invoiceColumns"
                        :ui="COMPONENTS.table.ui"
                        :get-row-id="rowIdOf"
                    >
                    <template #expand-cell="{ row: invoiceRow }">
                      <UButton
                          :color="COLOR.neutral"
                          :variant="NOISE.quiet"
                          :icon="invoiceRow.getIsExpanded() ? ICONS.chevronDown : ICONS.chevronRight"
                          square
                          :size="SIZES.small"
                          aria-label="Vis transaktioner"
                          @click="toggleSelection(invoiceRow, invoiceRow.original.id, invoiceParam, setInvoiceParam)"
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

                    <template #expanded="{ row: invoiceRow }">
                      <div :class="[COMPONENTS.adminEconomy.invoicePanel, BG.panelNested]">
                        <div v-if="invoiceTransactionsGrouped.length > 0 || isInvoiceTransactionsLoading" :class="[COMPONENTS.adminEconomy.invoiceFrame, BORDER.gray.frame]">
                          <div :class="[COMPONENTS.adminEconomy.invoiceHeader, COMPONENTS.economyTable.level2.header]">
                            <div :class="COMPONENTS.adminEconomy.invoiceTitle">
                              <h4 :class="TYPOGRAPHY.cardTitle">PBS Faktura for {{ formatDate(selectedBillingPeriodDetail.paymentDate, 'MMMM yyyy') }}</h4>
                              <p :class="TYPOGRAPHY.bodyTextMuted">{{ invoiceRow.original.address }} · PBS {{ invoiceRow.original.pbsId }}</p>
                            </div>
                            <div :class="COMPONENTS.adminEconomy.statBoxes">
                              <div :class="[COMPONENTS.adminEconomy.statBox, COMPONENTS.economyTable.level2.statBox]">
                                <UIcon :name="ICONS.calendar" :class="COMPONENTS.economyTable.level2.icon"/>
                                <div :class="COMPONENTS.adminEconomy.statText">
                                  <p :class="COMPONENTS.adminEconomy.statValue">{{ dinnerBreakdownStats.dinnerCount }}</p>
                                  <p :class="TYPOGRAPHY.finePrintMuted">Middage</p>
                                </div>
                              </div>
                              <div :class="[COMPONENTS.adminEconomy.statBox, COMPONENTS.economyTable.level2.statBox]">
                                <UIcon :name="ICONS.dinner" :class="COMPONENTS.economyTable.level2.icon"/>
                                <div :class="COMPONENTS.adminEconomy.statText">
                                  <p :class="COMPONENTS.adminEconomy.statValue">{{ dinnerBreakdownStats.ticketCounts }}</p>
                                  <p :class="TYPOGRAPHY.finePrintMuted">Kuverter</p>
                                </div>
                              </div>
                              <div :class="[COMPONENTS.adminEconomy.statBox, COMPONENTS.economyTable.level2.statBox]">
                                <UIcon :name="ICONS.shoppingCart" :class="COMPONENTS.economyTable.level2.icon"/>
                                <div :class="COMPONENTS.adminEconomy.statText">
                                  <p :class="COMPONENTS.adminEconomy.statValue">{{ formatPrice(dinnerBreakdownStats.total) }} kr</p>
                                  <p :class="TYPOGRAPHY.finePrintMuted">Total</p>
                                </div>
                              </div>
                            </div>
                          </div>
                          <UTable
                              :data="invoiceTransactionsGrouped"
                              :columns="dinnerColumns"
                              :ui="{...COMPONENTS.table.ui, thead: COMPONENTS.economyTable.level2.tableHead}"
                              :loading="isInvoiceTransactionsLoading"
                              :get-row-id="dinnerRowIdOf"
                          >
                          <template #loading>
                            <div :class="COMPONENTS.table.loadingRow">
                              <UIcon :name="ICONS.sync" :size="SIZES.smallIconSize" :class="COMPONENTS.table.loadingSpinner" />
                              Henter transaktioner...
                            </div>
                          </template>
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
                        </div>
                        <UAlert
                            v-else
                            v-bind="ALERTS.neutral"
                            title="Tomt her!"
                            description="Ingen transaktioner på denne faktura."
                        />
                      </div>
                    </template>

                    <template #footer>
                      <div :class="COMPONENTS.adminEconomy.periodFooter">
                        <span :class="TYPOGRAPHY.bodyTextMedium">
                          Total: {{ selectedBillingPeriodDetail.invoices.length }} husstande
                        </span>
                        <div :class="COMPONENTS.adminEconomy.periodFigures">
                          <span :class="TYPOGRAPHY.cardTitle">
                            {{ formatPrice(selectedBillingPeriodDetail.totalAmount) }} kr
                          </span>
                          <span v-if="billingPeriodControlSum?.isValid" :class="COMPONENTS.adminEconomy.controlSumValid">
                            <UIcon :name="ICONS.robotHappy" :class="SIZES.smallBadgeIcon"/>
                            {{ formatPrice(billingPeriodControlSum.computed) }} kr
                          </span>
                          <span v-else-if="billingPeriodControlSum" :class="COMPONENTS.adminEconomy.controlSumInvalid">
                            <UIcon :name="ICONS.robotDead" :class="SIZES.smallBadgeIcon"/>
                            {{ formatPrice(billingPeriodControlSum.computed) }} kr
                          </span>
                        </div>
                      </div>
                    </template>
                  </UTable>
                    </template>
                  </CostEntry>

                  <div :class="COMPONENTS.adminEconomy.shareRow">
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
