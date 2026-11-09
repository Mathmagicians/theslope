<script setup lang="ts">
/**
 * Public Billing Page - Magic link for accountant
 *
 * Public page accessible without authentication via magic link token.
 * Shows billing period summary with invoices and CSV download.
 *
 * Route: /public/billing/[token]
 * Data: GET /api/public/billing/[token]
 */
import type {TableColumn} from '@nuxt/ui'
import {formatDate} from '~/utils/date'
import type {InvoiceDisplay} from '~/composables/useBillingValidation'
import {BOOKING_WORDS} from '~/config/bookingWords'

// Page config - no auth required, no layout
definePageMeta({
    auth: false,
    layout: false
})

const route = useRoute()
const token = computed(() => String(route.params.token))

const {formatKroner} = useTicket()
const {ALERTS, COMPONENTS, ICONS, SIZES, TYPOGRAPHY, BG} = useTheSlopeDesignSystem()
const {publicBilling} = COMPONENTS
const {BillingPeriodSummaryDetailSchema} = useBillingValidation()
const {storeAsyncData} = useApiHandler()

const {data: billing, status, error} = storeAsyncData(
    () => `public-billing-${token.value}`,
    () => `/api/public/billing/${token.value}`,
    {
        schema: BillingPeriodSummaryDetailSchema.nullable(),
        default: () => null,
        errorMessage: BOOKING_WORDS.billing.failed.invoices
    }
)

const isLoading = computed(() => status.value === 'pending')
const isErrored = computed(() => status.value === 'error')
const isNotFound = computed(() => error.value?.statusCode === 404)

// Invoice columns
const columns: TableColumn<InvoiceDisplay>[] = [
    {accessorKey: 'pbsId', header: BOOKING_WORDS.billing.columns.pbsId},
    {accessorKey: 'address', header: BOOKING_WORDS.billing.columns.address},
    {accessorKey: 'amount', header: BOOKING_WORDS.billing.columns.amount}
]
</script>

<template>
  <div :class="[publicBilling.page, BG.invoiceGround]" data-testid="public-billing">
    <div :class="publicBilling.column">
      <!-- Error States -->
      <UAlert
          v-if="isNotFound"
          v-bind="ALERTS.warning"
          :title="BOOKING_WORDS.billing.publicPage.notFound.title"
          :description="BOOKING_WORDS.billing.publicPage.notFound.description"/>

      <ViewError v-else-if="isErrored" :error="error?.statusCode" :message="BOOKING_WORDS.billing.failed.invoices"/>
      <Loader v-else-if="isLoading" text="Henter fakturaoversigt..."/>

      <!-- Billing Data -->
      <template v-else-if="billing">
        <!-- Header -->
        <UCard :class="publicBilling.header">
          <template #header>
            <div :class="publicBilling.headerRow">
              <UIcon :name="ICONS.shoppingCart" :size="SIZES.largeIconSize"/>
              <div>
                <h1 :class="TYPOGRAPHY.cardTitle">{{ BOOKING_WORDS.billing.publicPage.title }}</h1>
                <p :class="TYPOGRAPHY.bodyTextMuted">{{ BOOKING_WORDS.billing.publicPage.community }}</p>
              </div>
            </div>
          </template>

          <div :class="publicBilling.facts">
            <div :class="[publicBilling.fact, BG.invoiceStat]">
              <p :class="TYPOGRAPHY.bodyTextMuted">{{ BOOKING_WORDS.billing.summary.billingPeriod }}</p>
              <p :class="TYPOGRAPHY.cardTitle">{{ billing.billingPeriod.replace('-', ' - ') }}</p>
            </div>
            <div :class="[publicBilling.fact, BG.invoiceStat]">
              <p :class="TYPOGRAPHY.bodyTextMuted">{{ BOOKING_WORDS.billing.summary.cutoffDate }}</p>
              <p :class="TYPOGRAPHY.cardTitle">{{ formatDate(billing.cutoffDate) }}</p>
            </div>
            <div :class="[publicBilling.fact, BG.invoiceStat]">
              <p :class="TYPOGRAPHY.bodyTextMuted">{{ BOOKING_WORDS.billing.summary.paymentDate }}</p>
              <p :class="TYPOGRAPHY.cardTitle">{{ formatMonthYear(billing.paymentDate) }}</p>
            </div>
            <div :class="[publicBilling.fact, BG.invoiceStat]">
              <p :class="TYPOGRAPHY.bodyTextMuted">{{ BOOKING_WORDS.billing.stats.total }}</p>
              <p :class="TYPOGRAPHY.cardTitle">{{ formatKroner(billing.totalAmount) }}</p>
            </div>
          </div>

          <template #footer>
            <div :class="publicBilling.footer">
              <ShareLinksPopover :share-token="token" hide-external-link prominent/>
            </div>
          </template>
        </UCard>

        <!-- Stats tiles -->
        <div :class="publicBilling.tiles">
          <UCard>
            <div :class="publicBilling.tile">
              <UIcon :name="ICONS.household" :class="publicBilling.tileIcon"/>
              <div>
                <p :class="TYPOGRAPHY.cardTitle">{{ billing.householdCount }}</p>
                <p :class="TYPOGRAPHY.bodyTextMuted">{{ BOOKING_WORDS.billing.stats.households }}</p>
              </div>
            </div>
          </UCard>
          <UCard>
            <div :class="publicBilling.tile">
              <UIcon :name="ICONS.dinner" :class="publicBilling.tileIcon"/>
              <div>
                <p :class="TYPOGRAPHY.cardTitle">{{ billing.ticketCount }}</p>
                <p :class="TYPOGRAPHY.bodyTextMuted">{{ BOOKING_WORDS.billing.stats.tickets }}</p>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Invoices Table -->
        <UCard>
          <template #header>
            <h2 :class="TYPOGRAPHY.cardTitle">{{ BOOKING_WORDS.billing.titles.invoices }}</h2>
          </template>

          <UTable
              :data="billing.invoices"
              :columns="columns"
              :ui="COMPONENTS.table.ui"
          >
            <template #amount-cell="{ row }">
              <div :class="publicBilling.amount">{{ formatKroner(row.original.amount) }}</div>
            </template>
          </UTable>

          <template #footer>
            <div :class="publicBilling.footer">
              <span :class="TYPOGRAPHY.cardTitle">{{ BOOKING_WORDS.billing.sums.total }} {{ formatKroner(billing.totalAmount) }}</span>
            </div>
          </template>
        </UCard>
      </template>
    </div>
  </div>
</template>
