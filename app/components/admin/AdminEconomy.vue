<script setup lang="ts">
/**
 * AdminEconomy - Admin billing overview (Økonomi tab)
 *
 * Shows:
 * - Overview stats of latest closed billing period
 * - Table of billing periods with expandable invoice details
 * - Inline share link section in expanded view
 *
 * Data: Uses bookings store for billing periods (ADR-007)
 */
import {formatDate} from '~/utils/date'
import type {BillingInvoice} from '~/composables/useBillingValidation'

const {formatPrice} = useTicket()
const {COMPONENTS, ICONS, SIZES, TYPOGRAPHY, COLOR} = useTheSlopeDesignSystem()

// Use bookings store for billing periods (ADR-007)
const bookingsStore = useBookingsStore()
const {
    billingPeriods,
    billingPeriodsError,
    isBillingPeriodsLoading,
    isBillingPeriodsErrored,
    selectedBillingPeriodDetail,
    isBillingPeriodDetailLoading
} = storeToRefs(bookingsStore)
const {loadBillingPeriodDetail} = bookingsStore

// Latest closed period for overview stats
const latestPeriod = computed(() => billingPeriods.value[0] ?? null)

// Expanded period tracking
const expandedPeriod = ref<Record<number, boolean>>({})

// Watch for expansion changes to load detail
watch(expandedPeriod, (newExpanded) => {
    const expandedIdx = Object.keys(newExpanded).find(k => newExpanded[Number(k)])
    if (expandedIdx !== undefined) {
        const period = billingPeriods.value[Number(expandedIdx)]
        if (period) loadBillingPeriodDetail(period.id)
    }
}, {deep: true})

// Table columns
const columns = [
    {id: 'expand'},
    {accessorKey: 'billingPeriod', header: 'Forbrugsperiode'},
    {accessorKey: 'householdCount', header: 'Husstande'},
    {accessorKey: 'totalAmount', header: 'Omsætning'},
    {accessorKey: 'paymentDate', header: 'PBS opkrævet'}
]

// Invoice columns for expanded view
const invoiceColumns = [
    {accessorKey: 'pbsId', header: 'PBS ID'},
    {accessorKey: 'address', header: 'Adresse'},
    {accessorKey: 'amount', header: 'Beløb'}
]

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
      <!-- Overview Stats -->
      <UCard v-if="latestPeriod">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon :name="ICONS.shoppingCart" :size="SIZES.standardIconSize"/>
              <div>
                <h3 :class="TYPOGRAPHY.cardTitle">Overblik - Sidste afsluttede periode</h3>
                <p :class="TYPOGRAPHY.bodyTextMuted">{{ latestPeriod.billingPeriod.replace('-', ' - ') }}</p>
              </div>
            </div>
            <UButton
                :color="COLOR.neutral"
                variant="ghost"
                :size="SIZES.small"
                :to="`/public/billing/${latestPeriod.shareToken}`"
            >
              <UIcon :name="ICONS.economy" class="mr-1"/>
              Del med revisor
              <UIcon :name="ICONS.chevronRight"/>
            </UButton>
          </div>
        </template>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
            <p :class="TYPOGRAPHY.cardTitle">{{ formatPrice(latestPeriod.totalAmount) }} kr</p>
            <p :class="TYPOGRAPHY.bodyTextMuted">Omsætning total</p>
          </div>
          <div class="text-center p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
            <p :class="TYPOGRAPHY.cardTitle">{{ latestPeriod.householdCount }}</p>
            <p :class="TYPOGRAPHY.bodyTextMuted">Husstande faktureret</p>
          </div>
          <div class="text-center p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
            <p :class="TYPOGRAPHY.cardTitle">{{ latestPeriod.ticketCount }}</p>
            <p :class="TYPOGRAPHY.bodyTextMuted">Kuverter total</p>
          </div>
          <div class="text-center p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
            <p :class="TYPOGRAPHY.cardTitle">{{ formatDate(latestPeriod.paymentDate, 'MMMM yyyy') }}</p>
            <p :class="TYPOGRAPHY.bodyTextMuted">PBS opkrævet</p>
          </div>
        </div>
      </UCard>

      <!-- Billing Periods Table -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon :name="ICONS.clock" :size="SIZES.standardIconSize"/>
            <h3 :class="TYPOGRAPHY.cardTitle">Faktureringsperioder</h3>
          </div>
        </template>

        <UTable
            v-if="billingPeriods.length > 0"
            v-model:expanded="expandedPeriod"
            :data="billingPeriods"
            :columns="columns"
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

          <template #billingPeriod-cell="{ row }">
            {{ row.original.billingPeriod.replace('-', ' - ') }}
          </template>

          <template #totalAmount-cell="{ row }">
            {{ formatPrice(row.original.totalAmount) }} kr
          </template>

          <template #paymentDate-cell="{ row }">
            {{ formatDate(row.original.paymentDate, 'MMMM yyyy') }}
          </template>

          <template #expanded>
            <div v-if="selectedBillingPeriodDetail && !isBillingPeriodDetailLoading" class="p-4 bg-neutral-50 dark:bg-neutral-900 space-y-4">
              <!-- Invoice table -->
              <UTable
                  :data="selectedBillingPeriodDetail.invoices"
                  :columns="invoiceColumns"
                  :ui="COMPONENTS.table.ui"
              >
                <template #amount-cell="{ row }">
                  {{ formatPrice((row.original as BillingInvoice).amount) }} kr
                </template>
              </UTable>

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
            </div>
            <div v-else class="p-4 bg-neutral-50 dark:bg-neutral-900">
              <Loader text="Henter fakturadetaljer..."/>
            </div>
          </template>
        </UTable>

        <UAlert
            v-else
            :icon="ICONS.clock"
            color="neutral"
            variant="subtle"
            title="Ingen faktureringsperioder"
            description="Der er endnu ikke genereret nogen faktureringsperioder."
        />
      </UCard>
    </template>
  </div>
</template>
