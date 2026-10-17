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
import {formatDate} from '~/utils/date'
import type {InvoiceDisplay} from '~/composables/useBillingValidation'

// Page config - no auth required, no layout
definePageMeta({
    auth: false,
    layout: false
})

const route = useRoute()
const token = computed(() => route.params.token as string)

const {formatPrice} = useTicket()
const {COMPONENTS, ICONS, SIZES, TYPOGRAPHY, BG} = useTheSlopeDesignSystem()
const {BillingPeriodSummaryDetailSchema} = useBillingValidation()
const {storeAsyncData} = useApiHandler()

const {data: billing, status, error} = storeAsyncData(
    () => `public-billing-${token.value}`,
    () => `/api/public/billing/${token.value}`,
    {
        schema: BillingPeriodSummaryDetailSchema.nullable(),
        default: () => null,
        errorMessage: 'Kunne ikke hente fakturaoversigt'
    }
)

const isLoading = computed(() => status.value === 'pending')
const isErrored = computed(() => status.value === 'error')
const isNotFound = computed(() => error.value?.statusCode === 404)

// Invoice columns
const columns = [
    {accessorKey: 'pbsId', header: 'PBS ID'},
    {accessorKey: 'address', header: 'Adresse'},
    {accessorKey: 'amount', header: 'Beløb'}
]
</script>

<template>
  <div :class="['min-h-screen py-8', BG.invoiceGround]" data-testid="public-billing">
    <div class="max-w-6xl mx-auto px-4">
      <!-- Error States -->
      <UCard v-if="isNotFound" class="text-center">
        <UIcon :name="ICONS.exclamationCircle" class="text-6xl text-warning-500 mb-4"/>
        <h1 :class="TYPOGRAPHY.cardTitle">Link ikke fundet</h1>
        <p :class="TYPOGRAPHY.bodyTextMuted">Dette link er ugyldigt eller udløbet.</p>
      </UCard>

      <ViewError v-else-if="isErrored" :error="error?.statusCode" message="Kunne ikke hente fakturaoversigt"/>
      <Loader v-else-if="isLoading" text="Henter fakturaoversigt..."/>

      <!-- Billing Data -->
      <template v-else-if="billing">
        <!-- Header -->
        <UCard class="mb-6">
          <template #header>
            <div class="flex items-center gap-3">
              <UIcon :name="ICONS.shoppingCart" :size="SIZES.largeIconSize"/>
              <div>
                <h1 :class="TYPOGRAPHY.cardTitle">PBS Fakturaoversigt</h1>
                <p :class="TYPOGRAPHY.bodyTextMuted">Skrååningen Fællesspisning</p>
              </div>
            </div>
          </template>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div :class="['text-center p-4 rounded-lg', BG.invoiceStat]">
              <p :class="TYPOGRAPHY.bodyTextMuted">Forbrugsperiode</p>
              <p :class="TYPOGRAPHY.cardTitle">{{ billing.billingPeriod.replace('-', ' - ') }}</p>
            </div>
            <div :class="['text-center p-4 rounded-lg', BG.invoiceStat]">
              <p :class="TYPOGRAPHY.bodyTextMuted">Opgørelsesdato</p>
              <p :class="TYPOGRAPHY.cardTitle">{{ formatDate(billing.cutoffDate) }}</p>
            </div>
            <div :class="['text-center p-4 rounded-lg', BG.invoiceStat]">
              <p :class="TYPOGRAPHY.bodyTextMuted">PBS opkræves</p>
              <p :class="TYPOGRAPHY.cardTitle">{{ formatDate(billing.paymentDate, 'MMMM yyyy') }}</p>
            </div>
            <div :class="['text-center p-4 rounded-lg', BG.invoiceStat]">
              <p :class="TYPOGRAPHY.bodyTextMuted">Total</p>
              <p :class="TYPOGRAPHY.cardTitle">{{ formatPrice(billing.totalAmount) }} kr</p>
            </div>
          </div>

          <template #footer>
            <div class="flex justify-end">
              <ShareLinksPopover :share-token="token" hide-external-link prominent/>
            </div>
          </template>
        </UCard>

        <!-- Stats tiles -->
        <div class="grid grid-cols-2 gap-4 mb-6">
          <UCard>
            <div class="flex items-center gap-4">
              <UIcon :name="ICONS.household" class="text-4xl text-primary-500"/>
              <div>
                <p :class="TYPOGRAPHY.cardTitle">{{ billing.householdCount }}</p>
                <p :class="TYPOGRAPHY.bodyTextMuted">Husstande</p>
              </div>
            </div>
          </UCard>
          <UCard>
            <div class="flex items-center gap-4">
              <UIcon :name="ICONS.dinner" class="text-4xl text-primary-500"/>
              <div>
                <p :class="TYPOGRAPHY.cardTitle">{{ billing.ticketCount }}</p>
                <p :class="TYPOGRAPHY.bodyTextMuted">Kuverter</p>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Invoices Table -->
        <UCard>
          <template #header>
            <h2 :class="TYPOGRAPHY.cardTitle">Fakturaer</h2>
          </template>

          <UTable
              :data="billing.invoices"
              :columns="columns"
              :ui="COMPONENTS.table.ui"
          >
            <template #amount-cell="{ row }">
              <div class="text-right">{{ formatPrice((row.original as InvoiceDisplay).amount) }} kr</div>
            </template>
          </UTable>

          <template #footer>
            <div class="flex justify-end">
              <span :class="TYPOGRAPHY.cardTitle">Total: {{ formatPrice(billing.totalAmount) }} kr</span>
            </div>
          </template>
        </UCard>
      </template>
    </div>
  </div>
</template>
