<script setup lang="ts">
/**
 * AdminEconomy - Admin billing overview (Økonomi tab)
 *
 * Two sections:
 * - Aktuel periode: current period transactions grouped by dinner (virtual BP)
 * - Tidligere perioder: past billing periods → invoices → transactions (lazy loaded)
 *
 * Uses EconomyTable for date-based filtering, CostEntry/CostLine for grouped items.
 * Data: Uses bookings store (ADR-007) with lazy loading for details.
 */
import {formatDate} from '~/utils/date'
import type {TransactionDisplay, CostEntry} from '~/composables/useBillingValidation'

const {formatPrice} = useTicket()
const {groupByCostEntry, calculateCurrentBillingPeriod} = useBilling()
const {ICONS, SIZES, TYPOGRAPHY, COLOR} = useTheSlopeDesignSystem()

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

// Current billing period dates
const currentPeriod = computed(() => calculateCurrentBillingPeriod())

// Transaction accessors for groupByCostEntry
const txDinner = (tx: TransactionDisplay) => tx.dinnerEvent
const txAmount = (tx: TransactionDisplay) => tx.amount

// Current period grouped by dinner
const currentPeriodGrouped = computed(() =>
    groupByCostEntry(currentPeriodTransactions.value, txDinner, txAmount)
)

// Selected invoice transactions grouped by dinner
const invoiceTransactionsGrouped = computed(() =>
    groupByCostEntry(selectedInvoiceTransactions.value, txDinner, txAmount)
)

// Current period total
const currentPeriodTotal = computed(() =>
    currentPeriodTransactions.value.reduce((sum, tx) => sum + tx.amount, 0)
)

// Dinner columns for current period table
const dinnerColumns = [
    {id: 'expand'},
    {accessorKey: 'date', header: 'Dato'},
    {accessorKey: 'menuTitle', header: 'Menu'},
    {accessorKey: 'ticketCounts', header: 'Kuverter'},
    {accessorKey: 'totalAmount', header: 'Beløb'}
]

// Past periods columns
const periodColumns = [
    {id: 'expand'},
    {accessorKey: 'date', header: 'Dato'},  // paymentDate for filtering
    {accessorKey: 'billingPeriod', header: 'Forbrugsperiode'},
    {accessorKey: 'householdCount', header: 'Husstande'},
    {accessorKey: 'totalAmount', header: 'Omsætning'}
]

// Past periods data with date field for EconomyTable
const pastPeriodsData = computed(() =>
    billingPeriods.value.map(bp => ({
        ...bp,
        date: new Date(bp.paymentDate)  // EconomyTable filters on this
    }))
)

// Single history visible at a time
const historyOrderId = ref<number | null>(null)
const toggleHistory = (orderId: number | null) => {
    historyOrderId.value = historyOrderId.value === orderId ? null : orderId
}

// Expanded invoice tracking
const expandedInvoiceId = ref<number | null>(null)
const toggleInvoice = (invoiceId: number) => {
    if (expandedInvoiceId.value === invoiceId) {
        expandedInvoiceId.value = null
    } else {
        expandedInvoiceId.value = invoiceId
        loadInvoiceTransactions(invoiceId)
    }
}

// Share link state
const linkCopied = ref(false)

const getShareUrl = (shareToken: string): string => {
    const baseUrl = window.location.origin
    return `${baseUrl}/public/billing/${shareToken}`
}

const copyLink = async (shareToken: string) => {
    await navigator.clipboard.writeText(getShareUrl(shareToken))
    linkCopied.value = true
    setTimeout(() => { linkCopied.value = false }, 2000)
}

const downloadCsv = (shareToken: string) => {
    window.open(`/api/public/billing/${shareToken}/csv`, '_blank')
}
</script>

<template>
  <div data-testid="admin-economy" class="space-y-6">
    <ViewError v-if="isBillingPeriodsErrored" :error="billingPeriodsError?.statusCode" message="Kunne ikke hente økonomioversigt"/>
    <Loader v-else-if="isBillingPeriodsLoading" text="Henter økonomioversigt..."/>

    <template v-else>
      <!-- Aktuel periode (Current Period - Virtual BP) -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon :name="ICONS.shoppingCart" :size="SIZES.standardIconSize"/>
            <div>
              <h3 :class="TYPOGRAPHY.cardTitle">Aktuel periode</h3>
              <p :class="TYPOGRAPHY.bodyTextMuted">
                {{ formatDate(currentPeriod.start) }} - {{ formatDate(currentPeriod.end) }}
              </p>
            </div>
          </div>
        </template>

        <EconomyTable
            :data="currentPeriodGrouped"
            :columns="dinnerColumns"
            row-key="dinnerEventId"
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
                @click="row.toggleExpanded()"
            />
          </template>
          <template #totalAmount-cell="{ row }">{{ formatPrice(row.original.totalAmount) }} kr</template>
          <template #expanded="{ row }">
            <UCard class="ml-2 md:ml-8 mr-2 md:mr-4 my-2">
              <div class="space-y-2 max-h-64 md:max-h-96 overflow-y-auto">
                <CostLine
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
            </UCard>
          </template>
          <template #empty>
            <UAlert
                :icon="ICONS.robotHappy"
                color="neutral"
                variant="subtle"
                title="Tomt her!"
                description="Ingen har spist i denne periode endnu - måske kommer de snart!"
            />
          </template>
        </EconomyTable>

        <template v-if="currentPeriodGrouped.length > 0" #footer>
          <div class="flex justify-end items-center gap-2">
            <span :class="TYPOGRAPHY.bodyTextMedium">Total:</span>
            <span :class="TYPOGRAPHY.cardTitle">{{ formatPrice(currentPeriodTotal) }} kr</span>
          </div>
        </template>
      </UCard>

      <!-- Tidligere perioder (Past Billing Periods) -->
      <UCard v-if="pastPeriodsData.length > 0">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon :name="ICONS.clock" :size="SIZES.standardIconSize"/>
            <h3 :class="TYPOGRAPHY.cardTitle">Tidligere perioder</h3>
          </div>
        </template>

        <EconomyTable
            :data="pastPeriodsData"
            :columns="periodColumns"
            row-key="id"
            search-placeholder="Søg måned..."
        >
          <template #expand-cell="{ row }">
            <UButton
                color="neutral"
                variant="ghost"
                :icon="row.getIsExpanded() ? ICONS.chevronDown : ICONS.chevronRight"
                square
                :size="SIZES.small"
                aria-label="Vis detaljer"
                @click="row.toggleExpanded(); loadBillingPeriodDetail(row.original.id)"
            />
          </template>
          <template #date-cell="{ row }">{{ formatDate(row.original.paymentDate, 'MMMM yyyy') }}</template>
          <template #billingPeriod-cell="{ row }">{{ row.original.billingPeriod.replace('-', ' - ') }}</template>
          <template #totalAmount-cell="{ row }">{{ formatPrice(row.original.totalAmount) }} kr</template>

          <template #expanded>
            <div class="p-4 bg-neutral-50 dark:bg-neutral-900 space-y-4">
              <Loader v-if="isBillingPeriodDetailLoading" text="Henter fakturadetaljer..."/>

              <template v-else-if="selectedBillingPeriodDetail">
                <!-- Invoice list with expandable transactions -->
                <div class="space-y-2">
                  <div
                      v-for="invoice in selectedBillingPeriodDetail.invoices"
                      :key="invoice.id"
                      class="border rounded-lg"
                  >
                    <button
                        class="w-full flex items-center justify-between p-3 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        @click="toggleInvoice(invoice.id)"
                    >
                      <div class="flex items-center gap-2">
                        <UIcon
                            :name="expandedInvoiceId === invoice.id ? ICONS.chevronDown : ICONS.chevronRight"
                            class="text-neutral-500"
                        />
                        <span :class="TYPOGRAPHY.bodyTextMedium">{{ invoice.address }}</span>
                        <span :class="TYPOGRAPHY.bodyTextMuted">(PBS: {{ invoice.pbsId }})</span>
                      </div>
                      <span :class="TYPOGRAPHY.bodyTextMedium">{{ formatPrice(invoice.amount) }} kr</span>
                    </button>

                    <!-- Expanded invoice transactions -->
                    <div v-if="expandedInvoiceId === invoice.id" class="border-t p-3 bg-white dark:bg-neutral-950">
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
                          description="Ingen transaktioner på denne faktura - mystisk!"
                      />
                    </div>
                  </div>
                </div>

                <!-- Total row -->
                <div class="flex justify-between items-center border-t pt-4">
                  <span :class="TYPOGRAPHY.bodyTextMedium">
                    Total: {{ selectedBillingPeriodDetail.invoices.length }} husstande
                  </span>
                  <span :class="TYPOGRAPHY.cardTitle">
                    {{ formatPrice(selectedBillingPeriodDetail.totalAmount) }} kr
                  </span>
                </div>

                <!-- Share & Download actions -->
                <div class="flex flex-col md:flex-row gap-4 border-t pt-4">
                  <div class="flex-1">
                    <p :class="[TYPOGRAPHY.bodyTextMuted, 'mb-2']">Del med bogholder:</p>
                    <div class="flex gap-2">
                      <UInput
                          :model-value="getShareUrl(selectedBillingPeriodDetail.shareToken)"
                          readonly
                          class="flex-1 font-mono text-xs"
                      />
                      <UButton
                          :color="linkCopied ? COLOR.success : COLOR.primary"
                          :icon="linkCopied ? ICONS.check : 'i-heroicons-clipboard'"
                          :size="SIZES.small"
                          @click="copyLink(selectedBillingPeriodDetail.shareToken)"
                      >
                        {{ linkCopied ? 'Kopieret!' : 'Kopier' }}
                      </UButton>
                    </div>
                  </div>
                  <div class="flex items-end">
                    <UButton
                        :color="COLOR.neutral"
                        variant="outline"
                        icon="i-heroicons-arrow-down-tray"
                        :size="SIZES.small"
                        @click="downloadCsv(selectedBillingPeriodDetail.shareToken)"
                    >
                      Download CSV
                    </UButton>
                  </div>
                </div>
              </template>
            </div>
          </template>
        </EconomyTable>
      </UCard>

      <UAlert
          v-else
          :icon="ICONS.robotHappy"
          color="neutral"
          variant="subtle"
          title="Tomt her!"
          description="Ingen faktureringsperioder endnu - PBS-robot sover stadig!"
      />
    </template>
  </div>
</template>
