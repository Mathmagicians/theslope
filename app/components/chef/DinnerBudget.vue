<script setup lang="ts">
/**
 * DinnerBudget - Financial overview for dinner event
 *
 * Compact mode (in ChefMenuCard summary line):
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 💰 1.781 kr                                                              │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Full mode (expanded - 3-box with expandable table):
 * ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
 * │ 💰 INDTÆGTER       │  │ 🛒 RÅDIGHEDSBELØB  │  │ 🏠 KØKKENBIDRAG    │
 * │     1.875 kr       │  │     1.781 kr       │  │       94 kr        │
 * │  (45 billetter)    │  │   (inkl. moms)     │  │    (5% af salg)    │
 * └────────────────────┘  └────────────────────┘  └────────────────────┘
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ DETALJER                                                            [▲] │
 * ├──────────────────────────────────────────────────────────────────────────┤
 * │ Billettype        │ Antal │ Stk pris │ Total                            │
 * │ Voksen            │    30 │   50 kr  │ 1.500 kr                         │
 * │ Barn              │    12 │   25 kr  │   300 kr                         │
 * │ Baby              │     3 │    0 kr  │     0 kr                         │
 * ├──────────────────────────────────────────────────────────────────────────┤
 * │ Indtægter (inkl. moms)                              1.875 kr            │
 * │ Køkkenbidrag (5%)                                    -94 kr             │
 * │ Rådighedsbeløb (inkl. moms)                        1.781 kr             │
 * │ Rådighedsbeløb (ex moms /1.25)                     1.425 kr ← indkøb    │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Formula: Indtægter - Køkkenbidrag (5%) = Rådighedsbeløb
 *          Rådighedsbeløb / 1.25 = ex moms (for grocery shopping)
 * Config:  app.config.ts → theslope.kitchen.baseRatePercent=5, vatPercent=25
 *
 * Used in:
 * - ChefMenuCard (compact: summary, full: expanded details)
 *
 * ADR Compliance:
 * - ADR-001: Types from validation composables
 * - Mobile-first responsive design with design system
 * - Uses NuxtUI components, utilities from useOrder
 */
import type { OrderDetail } from '~/composables/useBookingValidation'

interface Props {
  orders: OrderDetail[]
  mode?: 'compact' | 'full'
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'compact'
})

// Design system
const { COLOR, SIZES, TYPOGRAPHY, BACKGROUNDS } = useTheSlopeDesignSystem()

// Kitchen config from app.config.ts
const appConfig = useAppConfig()
const kitchenBaseRatePercent = appConfig.theslope?.kitchen?.baseRatePercent ?? 5
const vatPercent = appConfig.theslope?.kitchen?.vatPercent ?? 25

// Business logic from useOrder
const { getActiveOrders, groupByTicketType } = useOrder()

// Price formatting utility
const { formatPrice } = usePriceFormat()

// Expandable details state
const showDetails = ref(false)

// Active orders (excluding RELEASED)
const activeOrders = computed(() => getActiveOrders(props.orders))

// Revenue by ticket type
const revenueByType = computed(() => {
  return groupByTicketType(activeOrders.value).map(group => ({
    ...group,
    unitPrice: activeOrders.value.find(o => o.ticketPrice.ticketType === group.ticketType)?.priceAtBooking || 0,
    revenue: activeOrders.value
      .filter(o => o.ticketPrice.ticketType === group.ticketType)
      .reduce((sum, o) => sum + o.priceAtBooking, 0)
  }))
})

// 3-box calculations (all default to 0 when no orders)
const totalRevenue = computed(() => activeOrders.value.reduce((sum, o) => sum + o.priceAtBooking, 0))
const kitchenContribution = computed(() => Math.round(totalRevenue.value * kitchenBaseRatePercent / 100))
const availableBudget = computed(() => totalRevenue.value - kitchenContribution.value)
const availableBudgetExVat = computed(() => Math.round(availableBudget.value / (1 + vatPercent / 100)))

// Ticket count
const ticketCount = computed(() => activeOrders.value.length)
</script>

<template>
  <!-- Compact Mode -->
  <div v-if="mode === 'compact'" :class="`inline-flex items-center gap-1 ${TYPOGRAPHY.body}`">
    <span>💰</span>
    <span class="font-medium">{{ formatPrice(availableBudget) }} kr</span>
  </div>

  <!-- Full Mode: 3-Box Layout -->
  <div v-else class="space-y-4">
    <!-- 3 Summary Boxes -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
      <!-- Box 1: Indtægter (Revenue) -->
      <UCard :ui="{ body: { padding: 'p-3' } }">
        <div class="text-center">
          <div :class="`flex items-center justify-center gap-1 ${TYPOGRAPHY.caption} text-neutral-500 mb-1`">
            <span>💰</span>
            <span>INDTÆGTER</span>
          </div>
          <div :class="`${TYPOGRAPHY.cardTitle} font-bold`">
            {{ formatPrice(totalRevenue) }} kr
          </div>
          <div :class="`${TYPOGRAPHY.caption} text-neutral-500`">
            ({{ ticketCount }} billetter)
          </div>
        </div>
      </UCard>

      <!-- Box 2: Rådighedsbeløb (Available Budget) -->
      <UCard :ui="{ body: { padding: 'p-3' } }" :class="BACKGROUNDS.hero.success">
        <div class="text-center">
          <div :class="`flex items-center justify-center gap-1 ${TYPOGRAPHY.caption} text-neutral-500 mb-1`">
            <span>🛒</span>
            <span>RÅDIGHEDSBELØB</span>
          </div>
          <div :class="`${TYPOGRAPHY.cardTitle} font-bold text-success`">
            {{ formatPrice(availableBudget) }} kr
          </div>
          <div :class="`${TYPOGRAPHY.caption} text-neutral-500`">
            (inkl. moms)
          </div>
        </div>
      </UCard>

      <!-- Box 3: Køkkenbidrag (Kitchen Contribution) -->
      <UCard :ui="{ body: { padding: 'p-3' } }">
        <div class="text-center">
          <div :class="`flex items-center justify-center gap-1 ${TYPOGRAPHY.caption} text-neutral-500 mb-1`">
            <span>🏠</span>
            <span>KØKKENBIDRAG</span>
          </div>
          <div :class="`${TYPOGRAPHY.cardTitle} font-bold`">
            {{ formatPrice(kitchenContribution) }} kr
          </div>
          <div :class="`${TYPOGRAPHY.caption} text-neutral-500`">
            ({{ kitchenBaseRatePercent }}% af salg)
          </div>
        </div>
      </UCard>
    </div>

    <!-- Expandable Details Section -->
    <UCard :ui="{ body: { padding: 'p-0' } }">
      <!-- Details Header (clickable) -->
      <button
        type="button"
        class="w-full p-3 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
        name="toggle-budget-details"
        @click="showDetails = !showDetails"
      >
        <span :class="TYPOGRAPHY.cardTitle">DETALJER</span>
        <UIcon
          :name="showDetails ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
          class="w-5 h-5"
        />
      </button>

      <!-- Expandable Content -->
      <div v-if="showDetails" class="border-t">
        <!-- Ticket breakdown table -->
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b bg-neutral-50 dark:bg-neutral-800">
                <th :class="`px-4 py-2 text-left ${TYPOGRAPHY.caption} font-medium text-neutral-500`">Billettype</th>
                <th :class="`px-4 py-2 text-right ${TYPOGRAPHY.caption} font-medium text-neutral-500`">Antal</th>
                <th :class="`px-4 py-2 text-right ${TYPOGRAPHY.caption} font-medium text-neutral-500`">Stk pris</th>
                <th :class="`px-4 py-2 text-right ${TYPOGRAPHY.caption} font-medium text-neutral-500`">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="group in revenueByType"
                :key="group.ticketType"
                class="border-b last:border-b-0"
              >
                <td :class="`px-4 py-2 ${TYPOGRAPHY.body}`">{{ group.ticketType }}</td>
                <td :class="`px-4 py-2 text-right ${TYPOGRAPHY.body}`">{{ group.count }}</td>
                <td :class="`px-4 py-2 text-right ${TYPOGRAPHY.body}`">{{ formatPrice(group.unitPrice) }} kr</td>
                <td :class="`px-4 py-2 text-right ${TYPOGRAPHY.body} font-medium`">{{ formatPrice(group.revenue) }} kr</td>
              </tr>
              <!-- Empty state row when no tickets -->
              <tr v-if="revenueByType.length === 0">
                <td :class="`px-4 py-4 text-center text-neutral-500 italic ${TYPOGRAPHY.body}`" colspan="4">
                  Ingen billetter solgt endnu
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Summary lines -->
        <div class="border-t p-4 space-y-2">
          <div :class="`flex justify-between ${TYPOGRAPHY.body}`">
            <span class="text-neutral-600 dark:text-neutral-400">Indtægter (inkl. moms)</span>
            <span class="font-medium">{{ formatPrice(totalRevenue) }} kr</span>
          </div>
          <div :class="`flex justify-between ${TYPOGRAPHY.body}`">
            <span class="text-neutral-600 dark:text-neutral-400">Køkkenbidrag ({{ kitchenBaseRatePercent }}%)</span>
            <span class="font-medium text-neutral-500">-{{ formatPrice(kitchenContribution) }} kr</span>
          </div>
          <div :class="`flex justify-between ${TYPOGRAPHY.body} pt-2 border-t font-semibold`">
            <span>Rådighedsbeløb (inkl. moms)</span>
            <span class="text-success">{{ formatPrice(availableBudget) }} kr</span>
          </div>
          <div :class="`flex justify-between ${TYPOGRAPHY.body} items-center`">
            <span class="text-neutral-600 dark:text-neutral-400">Rådighedsbeløb (ex moms /{{ 1 + vatPercent / 100 }})</span>
            <div class="flex items-center gap-2">
              <span class="font-medium">{{ formatPrice(availableBudgetExVat) }} kr</span>
              <UBadge :color="COLOR.info" variant="soft" :size="SIZES.small.value">← indkøb</UBadge>
            </div>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
