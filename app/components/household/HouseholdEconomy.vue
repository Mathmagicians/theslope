<script setup lang="ts">
/**
 * HouseholdEconomy - Billing view for household (Økonomi tab)
 *
 * Two expandable tables:
 * - Current period: dinner groups with transaction details
 * - Past invoices: billing periods with grouped transactions
 *
 * Data: GET /api/billing?householdId=X
 */
import {formatDate} from '~/utils/date'
import type {HouseholdBillingResponse} from '~/composables/useBillingValidation'
import type {DinnerTransactionGroup} from '~/composables/useBilling'

interface Props {
    household: {id: number}
}

const props = defineProps<Props>()

// Composables
const {formatPrice, ticketTypeConfig} = useTicket()
const {groupTransactionsByDinner} = useBilling()
const {COMPONENTS, ICONS, SIZES, TYPOGRAPHY} = useTheSlopeDesignSystem()

// Data fetch (ADR-007: component-local exception)
const {data: billing, status, error} = useAsyncData<HouseholdBillingResponse | null>(
    `billing-${props.household.id}`,
    () => $fetch<HouseholdBillingResponse>('/api/billing', {query: {householdId: props.household.id}}),
    {default: () => null}
)

const isLoading = computed(() => status.value === 'pending')
const isErrored = computed(() => status.value === 'error')

// Current period grouped data
const currentPeriodData = computed(() =>
    billing.value ? groupTransactionsByDinner(billing.value.currentPeriod.transactions) : []
)

// Past invoices with pre-grouped transactions
interface InvoiceRow {
    id: number
    billingPeriod: string
    amount: number
    paymentMonth: string
    groups: DinnerTransactionGroup[]
}

const pastInvoicesData = computed((): InvoiceRow[] =>
    billing.value?.pastInvoices.map(inv => ({
        id: inv.id,
        billingPeriod: inv.billingPeriod.replace('-', ' - '),
        amount: inv.amount,
        paymentMonth: formatDate(new Date(inv.paymentDate), 'MMMM yyyy'),
        groups: groupTransactionsByDinner(inv.transactions)
    })) ?? []
)

// Single-expansion for tables
const {expanded: expandedCurrent} = useExpandableRow()
const {expanded: expandedInvoice} = useExpandableRow()

// Single history visible at a time
const historyOrderId = ref<number | null>(null)
const toggleHistory = (orderId: number | null) => {
    historyOrderId.value = historyOrderId.value === orderId ? null : orderId
}

// Table columns
const columns = {
    current: [
        {id: 'expand'},
        {accessorKey: 'date', header: 'Dato'},
        {accessorKey: 'menuTitle', header: 'Menu'},
        {accessorKey: 'ticketCounts', header: 'Kuverter'},
        {accessorKey: 'totalAmount', header: 'Beløb'}
    ],
    invoice: [
        {id: 'expand'},
        {accessorKey: 'billingPeriod', header: 'Forbrugsperiode'},
        {accessorKey: 'amount', header: 'Beløb'},
        {accessorKey: 'paymentMonth', header: 'PBS opkrævet'}
    ]
}
</script>

<template>
  <div data-testid="household-economy" class="space-y-6">
    <ViewError v-if="isErrored" :error="error?.statusCode" message="Kunne ikke hente økonomioversigt"/>
    <Loader v-else-if="isLoading" text="Henter økonomioversigt..."/>

    <template v-else-if="billing">
      <!-- Current Period -->
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
              <div v-for="tx in row.original.transactions" :key="tx.id" class="space-y-1">
                <div class="flex justify-between items-center" :class="TYPOGRAPHY.bodyTextSmall">
                  <div class="flex items-center gap-2">
                    <UButton
                        color="neutral"
                        variant="ghost"
                        :icon="historyOrderId === tx.orderId ? ICONS.chevronUp : ICONS.clipboard"
                        square
                        :size="SIZES.xSmall"
                        @click="toggleHistory(tx.orderId)"
                    />
                    <span>{{ tx.inhabitant.name }} ({{ tx.ticketType ? ticketTypeConfig[tx.ticketType]?.label : 'Ukendt' }})</span>
                  </div>
                  <span :class="TYPOGRAPHY.bodyTextMuted">{{ formatPrice(tx.amount) }} kr</span>
                </div>
                <OrderHistoryDisplay v-if="historyOrderId === tx.orderId" :order-id="tx.orderId"/>
              </div>
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
              <div v-for="group in row.original.groups" :key="group.dinnerEventId" class="border rounded p-2 bg-white dark:bg-neutral-800">
                <div class="flex justify-between mb-1" :class="TYPOGRAPHY.bodyTextMedium">
                  <span>{{ formatDate(group.date) }} - {{ group.menuTitle }}</span>
                  <span>{{ formatPrice(group.totalAmount) }} kr</span>
                </div>
                <div class="space-y-1 pl-2">
                  <div v-for="tx in group.transactions" :key="tx.id" class="space-y-1">
                    <div class="flex justify-between items-center" :class="TYPOGRAPHY.finePrint">
                      <div class="flex items-center gap-2">
                        <UButton
                            color="neutral"
                            variant="ghost"
                            :icon="historyOrderId === tx.orderId ? ICONS.chevronUp : ICONS.clipboard"
                            square
                            :size="SIZES.xSmall"
                            @click="toggleHistory(tx.orderId)"
                        />
                        <span>{{ tx.inhabitant.name }} ({{ tx.ticketType ? ticketTypeConfig[tx.ticketType]?.label : 'Ukendt' }})</span>
                      </div>
                      <span class="text-muted">{{ formatPrice(tx.amount) }} kr</span>
                    </div>
                    <OrderHistoryDisplay v-if="historyOrderId === tx.orderId" :order-id="tx.orderId"/>
                  </div>
                </div>
              </div>
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
