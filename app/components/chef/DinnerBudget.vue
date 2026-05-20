<script setup lang="ts">
/**
 * DinnerBudget - Financial overview for dinner event
 *
 * Compact mode (in ChefMenuCard summary line):
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 💰 1.425 kr                                                              │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Full mode (title + 3-box with expandable details):
 * Budget                                                                  [▼]
 * ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
 * │ 💰 INDTÆGTER       │  │ 🛒 RÅDIGHEDSBELØB  │  │ 🏠 KØKKENBIDRAG    │
 * │     1.875 kr       │  │   1.425 kr ex moms │  │     75 kr ex moms  │
 * │   45 billetter     │  │   1.781 kr inkl.   │  │     94 kr inkl.    │
 * └────────────────────┘  └────────────────────┘  └────────────────────┘
 *
 * [When expanded - ticket breakdown table + summary lines]
 *
 * Formula: Indtægter - Køkkenbidrag (5%) = Rådighedsbeløb
 *          Amount / 1.25 = ex moms (for grocery shopping)
 * Config:  app.config.ts → theslope.kitchen.baseRatePercent=5, vatPercent=25
 *
 * Used in:
 * - ChefMenuCard (compact: summary, full: expanded details)
 *
 * ADR Compliance:
 * - ADR-001: Types from validation composables, business logic in useOrder
 * - Mobile-first responsive design with design system
 * - Uses NuxtUI components, TYPOGRAPHY from design system
 */
import type { OrderDetail } from '~/composables/useBookingValidation'

interface Props {
  orders: OrderDetail[]
  mode?: 'compact' | 'full'
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'compact'
})

// Design system - TYPOGRAPHY for consistent text styling
const { TYPOGRAPHY } = useTheSlopeDesignSystem()

// Kitchen config from app.config.ts
const appConfig = useAppConfig()
const kitchenBaseRatePercent = appConfig.theslope?.kitchen?.baseRatePercent ?? 5
const vatPercent = appConfig.theslope?.kitchen?.vatPercent ?? 25

// Business logic from useOrder and useTicket
const { getActiveOrders, groupByTicketType, calculateBudget, calculateTotalPortionsFromPrices } = useOrder()
const { formatPrice } = useTicket()

// Expandable details state
const showDetails = ref(false)

// Active orders (excluding RELEASED)
const activeOrders = computed(() => getActiveOrders(props.orders))

// Budget calculations from composable (business logic)
const budget = computed(() => calculateBudget(props.orders, kitchenBaseRatePercent, vatPercent))

const totalPortions = computed(() => calculateTotalPortionsFromPrices(props.orders))

// Revenue by ticket type (for expanded details table)
const revenueByType = computed(() => groupByTicketType(activeOrders.value))
</script>

<template>
  <!-- Compact Mode -->
  <div v-if="mode === 'compact'" :class="`inline-flex items-center gap-1 ${TYPOGRAPHY.bodyTextSmall}`">
    <span>💰</span>
    <span class="font-medium">{{ formatPrice(budget.availableBudget) }} kr</span>
  </div>

  <!-- Full Mode: Title + 3-Box Layout -->
  <div v-else class="space-y-3">
    <!-- Section title with expand toggle -->
    <button
      type="button"
      class="flex items-center gap-2 hover:opacity-80 transition-opacity"
      name="toggle-budget-details"
      @click="showDetails = !showDetails"
    >
      <h4 :class="TYPOGRAPHY.sectionSubheading">Budget</h4>
      <UIcon
        :name="showDetails ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
        class="w-4 h-4 opacity-50"
      />
    </button>

    <!-- 3 Summary Boxes -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
      <!-- Box 1: Indtægter (Revenue) -->
      <UCard :ui="{ body: 'p-3' }">
        <div class="text-center">
          <div :class="`flex items-center justify-center gap-1 ${TYPOGRAPHY.caption} opacity-60 mb-1`">
            <span>💰</span>
            <span>INDTÆGTER</span>
          </div>
          <div :class="`${TYPOGRAPHY.cardTitle} font-bold text-success`">
            {{ formatPrice(budget.totalRevenue) }} kr
          </div>
          <div :class="`${TYPOGRAPHY.finePrint} opacity-60`">
            {{ Math.round(totalPortions) }} kuverter
          </div>
        </div>
      </UCard>

      <!-- Box 2: Rådighedsbeløb (Available Budget) -->
      <UCard :ui="{ body: 'p-3' }">
        <div class="text-center">
          <div :class="`flex items-center justify-center gap-1 ${TYPOGRAPHY.caption} opacity-60 mb-1`">
            <span>🛒</span>
            <span>RÅDIGHEDSBELØB</span>
          </div>
          <!-- Ex moms (largest, primary display) -->
          <div>
            <span :class="`${TYPOGRAPHY.cardTitle} font-bold text-xl text-success`">{{ formatPrice(budget.availableBudgetExVat) }} kr</span>
            <span :class="`${TYPOGRAPHY.finePrint} opacity-60`"> ex moms</span>
          </div>
          <!-- Inkl moms (secondary) -->
          <div class="mt-1">
            <span :class="`${TYPOGRAPHY.bodyTextSmall} text-success`">{{ formatPrice(budget.availableBudget) }} kr</span>
            <span :class="`${TYPOGRAPHY.finePrint} opacity-60`"> inkl. moms</span>
          </div>
        </div>
      </UCard>

      <!-- Box 3: Køkkenbidrag (Kitchen Contribution) -->
      <UCard :ui="{ body: 'p-3' }">
        <div class="text-center">
          <div :class="`flex items-center justify-center gap-1 ${TYPOGRAPHY.caption} opacity-60 mb-1`">
            <span>🏠</span>
            <span>KØKKENBIDRAG</span>
          </div>
          <!-- Ex moms (largest, primary display) -->
          <div>
            <span :class="`${TYPOGRAPHY.cardTitle} font-bold text-xl text-success`">{{ formatPrice(budget.kitchenContributionExVat) }} kr</span>
            <span :class="`${TYPOGRAPHY.finePrint} opacity-60`"> ex moms</span>
          </div>
          <!-- Inkl moms (secondary) -->
          <div class="mt-1">
            <span :class="`${TYPOGRAPHY.bodyTextSmall} text-success`">{{ formatPrice(budget.kitchenContribution) }} kr</span>
            <span :class="`${TYPOGRAPHY.finePrint} opacity-60`"> inkl. moms</span>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Expandable Details -->
    <div v-if="showDetails" class="border rounded-lg overflow-hidden">
      <!-- Ticket breakdown table -->
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b bg-neutral-50 dark:bg-neutral-800">
              <th :class="`px-4 py-2 text-left ${TYPOGRAPHY.caption} opacity-60`">Billettype</th>
              <th :class="`px-4 py-2 text-right ${TYPOGRAPHY.caption} opacity-60`">Antal</th>
              <th :class="`px-4 py-2 text-right ${TYPOGRAPHY.caption} opacity-60`">Stk pris</th>
              <th :class="`px-4 py-2 text-right ${TYPOGRAPHY.caption} opacity-60`">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="group in revenueByType"
              :key="group.ticketType"
              class="border-b last:border-b-0"
            >
              <td :class="`px-4 py-2 ${TYPOGRAPHY.bodyTextSmall}`">{{ group.ticketType }}</td>
              <td :class="`px-4 py-2 text-right ${TYPOGRAPHY.bodyTextSmall}`">{{ group.count }}</td>
              <td :class="`px-4 py-2 text-right ${TYPOGRAPHY.bodyTextSmall}`">{{ formatPrice(group.unitPrice) }} kr</td>
              <td :class="`px-4 py-2 text-right ${TYPOGRAPHY.bodyTextMedium}`">{{ formatPrice(group.revenue) }} kr</td>
            </tr>
            <!-- Empty state row when no tickets -->
            <tr v-if="revenueByType.length === 0">
              <td :class="`px-4 py-4 text-center italic ${TYPOGRAPHY.bodyTextMuted}`" colspan="4">
                Ingen billetter solgt endnu
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Summary lines -->
      <div class="border-t p-4 space-y-2">
        <div class="flex justify-between">
          <span :class="TYPOGRAPHY.bodyTextMuted">Indtægter (inkl. moms)</span>
          <span :class="TYPOGRAPHY.bodyTextMedium">{{ formatPrice(budget.totalRevenue) }} kr</span>
        </div>
        <div class="flex justify-between">
          <span :class="TYPOGRAPHY.bodyTextMuted">Køkkenbidrag ({{ budget.kitchenBaseRatePercent }}%)</span>
          <span :class="`${TYPOGRAPHY.bodyTextMedium} opacity-60`">-{{ formatPrice(budget.kitchenContribution) }} kr</span>
        </div>
        <div :class="`flex justify-between pt-2 border-t ${TYPOGRAPHY.bodyTextMedium} font-semibold`">
          <span>Rådighedsbeløb (inkl. moms)</span>
          <span class="text-success">{{ formatPrice(budget.availableBudget) }} kr</span>
        </div>
        <div class="flex justify-between">
          <span :class="`${TYPOGRAPHY.finePrint} opacity-60`">Rådighedsbeløb (ex moms)</span>
          <span :class="`${TYPOGRAPHY.finePrint} opacity-60`">{{ formatPrice(budget.availableBudgetExVat) }} kr</span>
        </div>
      </div>
    </div>
  </div>
</template>
