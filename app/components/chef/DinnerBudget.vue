<script setup lang="ts">
/**
 * DinnerBudget - Financial overview for dinner event
 *
 * Compact mode (in ChefMenuCard summary line):
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ (money) 1.425 kr                                                         │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Full mode, folded (title + 3 boxes, one chevron):
 * Budget                                                                    [>]
 * ┌ (money) INDTÆGTER ─┐ ┌ (cart) RÅDIGHEDSBELØB ─────────────┐ ┌ (house) KØKKENBIDRAG ┐
 * │ 1.500 / 1.875 kr   │ │ 1.425 / 1.781 kr                    │ │ 75 / 94 kr        │
 * │ ex / inkl. moms    │ │ ex / inkl. moms                     │ │ ex / inkl. moms   │
 * │ 45 kuverter        │ │ Brugt          1.310 / 1.638 kr     │ │ 5% af indtægter   │
 * │                    │ │ Tilbage    +115 / +143 kr (check) │ │                │
 * └────────────────────┘ └─────────────────────────────────────┘ └───────────────────┘
 *
 * Unfolded, under the boxes: Billetter (the ticket table named by type, its sums as its bottom rows down to
 * Rådighedsbeløb), this dinner as one spending row with its receipts under it, the team's round in the same shape
 * (CookingRoundSpending, headed by the words cookingRoundWords builds, handed in as roundWords) and last
 * Billetændringer (TicketChanges, folded behind its chevron, its window from the booking deadline), shown only while
 * the dinner has tickets.
 *
 * Every amount renders both units through VatAmount, the ex moms figure loud. Revenue counts every paid ticket, a
 * released one included (useOrder.calculateBudget).
 * Config:  app.config.ts → theslope.kitchen.baseRatePercent=5, vatPercent=25
 *
 * Used in:
 * - ChefMenuCard (compact: summary, full: the budget section of the chef's card)
 *
 * ADR Compliance:
 * - ADR-001: Types from validation composables, business logic in useOrder
 * - ADR-018: every class binds COMPONENTS.dinnerBudget
 */
import type { OrderDetail } from '~/composables/useBookingValidation'
import type { Expense } from '~/composables/useBillingValidation'
import type { CookingRoundRow, CookingRoundWords } from '~/composables/useBookingUi'
import type {TableColumn} from '@nuxt/ui'

interface Props {
  orders: OrderDetail[]
  mode?: 'compact' | 'full'
  expenses?: Expense[]
  dinnerEventId?: number | null
  bookingDeadline?: Date | null
  roundRows?: CookingRoundRow[]
  roundWords?: CookingRoundWords | null
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'compact',
  expenses: () => [],
  dinnerEventId: null,
  bookingDeadline: null,
  roundRows: () => [],
  roundWords: null
})

const { TYPOGRAPHY, COMPONENTS, ICONS } = useTheSlopeDesignSystem()

// Kitchen config from app.config.ts
const appConfig = useAppConfig()
const kitchenBaseRatePercent = appConfig.theslope?.kitchen?.baseRatePercent ?? 5
const vatPercent = appConfig.theslope?.kitchen?.vatPercent ?? 25

// Business logic from useOrder and useTicket
const { getActiveOrders, groupByTicketType, calculateBudget, calculateTotalPortionsFromPrices, spendingLeft, spendingAwaitsTickets } = useOrder()
const { formatPrice, ticketTypeConfig } = useTicket()

// Expandable details state
const showDetails = ref(false)

// Active orders (excluding RELEASED): the kitchen's eaters
const activeOrders = computed(() => getActiveOrders(props.orders))

// Budget calculations from composable (business logic)
const budget = computed(() => calculateBudget(props.orders, kitchenBaseRatePercent, vatPercent))

const totalPortions = computed(() => calculateTotalPortionsFromPrices(props.orders))

// Revenue by ticket type (for expanded details table)
const revenueByType = computed(() => groupByTicketType(activeOrders.value))
const ticketLabel = (ticketType: string) => ticketTypeConfig[ticketType as keyof typeof ticketTypeConfig]?.label ?? ticketType

// The grocery lines against the allowance
const spent = computed(() => sumAmounts(props.expenses))
const figures = computed(() => ({budgetGross: budget.value.availableBudget, spentGross: spent.value}))
const left = computed(() => spendingLeft(figures.value))
// This dinner's row of the spending table, the one the page marks as current
const ownRow = computed(() => props.roundRows.find(row => row.isCurrent) ?? null)

type TicketRevenueRow = (typeof revenueByType.value)[number]
const ticketColumns: TableColumn<TicketRevenueRow>[] = [
  {accessorKey: 'ticketType', header: 'Billettype'},
  {accessorKey: 'count', header: 'Antal', meta: COMPONENTS.table.amountColumn},
  {accessorKey: 'unitPrice', header: 'Stk pris', meta: COMPONENTS.table.amountColumn},
  {accessorKey: 'revenue', header: 'Total', meta: COMPONENTS.table.amountColumn}
]
</script>

<template>
  <!-- Compact Mode -->
  <div v-if="mode === 'compact'" :class="COMPONENTS.dinnerBudget.compact">
    <UIcon :name="ICONS.economy" :class="COMPONENTS.dinnerBudget.boxGlyph" />
    <span :class="COMPONENTS.dinnerBudget.compactAmount">{{ formatPrice(budget.availableBudget) }} kr</span>
  </div>

  <!-- Full Mode: Title + 3-Box Layout -->
  <div v-else :class="COMPONENTS.dinnerBudget.stack">
    <!-- Section title with expand toggle -->
    <button
      type="button"
      :class="COMPONENTS.dinnerBudget.toggle"
      name="toggle-budget-details"
      @click="showDetails = !showDetails"
    >
      <h4 :class="TYPOGRAPHY.sectionSubheading">Budget</h4>
      <UIcon :name="showDetails ? ICONS.chevronDown : ICONS.chevronRight" :class="COMPONENTS.dinnerBudget.toggleIcon" />
    </button>

    <!-- 3 Summary Boxes -->
    <div :class="COMPONENTS.dinnerBudget.boxes">
      <!-- Box 1: Indtægter (Revenue) -->
      <UCard :ui="COMPONENTS.dinnerBudget.boxUi" data-testid="budget-box-revenue">
        <div :class="COMPONENTS.dinnerBudget.box">
          <div :class="COMPONENTS.dinnerBudget.boxLabel">
            <UIcon :name="ICONS.economy" :class="COMPONENTS.dinnerBudget.boxGlyph" />
            <span :class="COMPONENTS.dinnerBudget.boxLabelText">INDTÆGTER</span>
          </div>
          <!-- Ticket money is what the households pay: plain kr, no VAT split -->
          <div :class="COMPONENTS.dinnerBudget.boxAmountLarge">{{ formatPrice(budget.totalRevenue) }} kr</div>
          <div :class="COMPONENTS.dinnerBudget.boxFact">
            {{ formatPortions(totalPortions) }} kuverter
          </div>
        </div>
      </UCard>

      <!-- Box 2: Rådighedsbeløb (Available Budget): start, used, left -->
      <UCard :ui="COMPONENTS.dinnerBudget.boxUi" data-testid="budget-box-available">
        <div :class="COMPONENTS.dinnerBudget.box">
          <div :class="COMPONENTS.dinnerBudget.boxLabel">
            <UIcon :name="ICONS.shoppingCart" :class="COMPONENTS.dinnerBudget.boxGlyph" />
            <span :class="COMPONENTS.dinnerBudget.boxLabelText">RÅDIGHEDSBELØB</span>
          </div>
          <div :class="COMPONENTS.dinnerBudget.boxAmountLarge"><VatAmount :gross="budget.availableBudget" /></div>
          <div :class="COMPONENTS.dinnerBudget.boxUnit">ex / inkl. moms</div>
          <div :class="COMPONENTS.dinnerBudget.boxLine">
            <span>Brugt</span>
            <VatAmount :gross="spent" data-testid="budget-spent" />
          </div>
          <div :class="COMPONENTS.dinnerBudget.boxLine">
            <span>Tilbage</span>
            <VatAmount :gross="left" balance :pending="spendingAwaitsTickets(figures)" data-testid="budget-left" />
          </div>
        </div>
      </UCard>

      <!-- Box 3: Køkkenbidrag (Kitchen Contribution) -->
      <UCard :ui="COMPONENTS.dinnerBudget.boxUi" data-testid="budget-box-contribution">
        <div :class="COMPONENTS.dinnerBudget.box">
          <div :class="COMPONENTS.dinnerBudget.boxLabel">
            <UIcon :name="ICONS.home" :class="COMPONENTS.dinnerBudget.boxGlyph" />
            <span :class="COMPONENTS.dinnerBudget.boxLabelText">KØKKENBIDRAG</span>
          </div>
          <div :class="COMPONENTS.dinnerBudget.boxAmountLarge"><VatAmount :gross="budget.kitchenContribution" /></div>
          <div :class="COMPONENTS.dinnerBudget.boxUnit">ex / inkl. moms</div>
          <div :class="COMPONENTS.dinnerBudget.unit">{{ budget.kitchenBaseRatePercent }}% af indtægter</div>
        </div>
      </UCard>
    </div>

    <!-- Expandable Details -->
    <div v-if="showDetails" :class="COMPONENTS.dinnerBudget.details" data-testid="budget-details">
      <!-- Billetter: the ticket table named by type -->
      <UTable :data="revenueByType" :columns="ticketColumns" :ui="COMPONENTS.table.ui" data-testid="budget-ticket-table">
        <template #ticketType-cell="{ row }">{{ ticketLabel(row.original.ticketType) }}</template>
        <template #unitPrice-cell="{ row }">{{ formatPrice(row.original.unitPrice) }} kr</template>
        <template #revenue-cell="{ row }">{{ formatPrice(row.original.revenue) }} kr</template>
        <template #empty>Ingen billetter solgt endnu</template>
        <template #body-bottom>
          <tr :class="COMPONENTS.table.totalRow" data-testid="budget-summary-revenue">
            <td :class="COMPONENTS.table.ui.td" colspan="3">Indtægter</td>
            <td :class="[COMPONENTS.table.ui.td, COMPONENTS.table.amountColumn.class.td]">{{ formatPrice(budget.totalRevenue) }} kr</td>
          </tr>
          <tr>
            <td :class="COMPONENTS.table.ui.td" colspan="3">Køkkenbidrag ({{ budget.kitchenBaseRatePercent }}%)</td>
            <td :class="[COMPONENTS.table.ui.td, COMPONENTS.table.amountColumn.class.td]"><span :class="COMPONENTS.dinnerBudget.summaryDeduction">-<VatAmount :gross="budget.kitchenContribution" /></span></td>
          </tr>
          <tr :class="COMPONENTS.table.totalRow" data-testid="budget-summary-available">
            <td :class="COMPONENTS.table.ui.td" colspan="3">Rådighedsbeløb</td>
            <td :class="[COMPONENTS.table.ui.td, COMPONENTS.table.amountColumn.class.td]"><VatAmount :gross="budget.availableBudget" /></td>
          </tr>
        </template>
      </UTable>

      <!-- This dinner in the spending table's shape, its receipts under it -->
      <div v-if="ownRow" :class="COMPONENTS.dinnerBudget.section">
        <CookingRoundSpending :words="null" :rows="[ownRow]" :receipts="expenses" />
      </div>

      <!-- The team's cooking round -->
      <div v-if="roundWords && roundRows.length > 1" :class="COMPONENTS.dinnerBudget.section">
        <CookingRoundSpending :words="roundWords" :rows="roundRows" />
      </div>

      <!-- Billetændringer last, folded, only while there are tickets -->
      <div v-if="dinnerEventId && orders.length" :class="COMPONENTS.dinnerBudget.section">
        <TicketChanges :dinner-event-id="dinnerEventId" :since="bookingDeadline" />
      </div>
    </div>
  </div>
</template>
