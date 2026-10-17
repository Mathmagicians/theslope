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
 * │ 1.875 kr           │ │ 1.425 / 1.781 kr                    │ │ 75 / 94 kr        │
 * │ 45 kuverter        │ │ ex / inkl. moms                     │ │ ex / inkl. moms   │
 * │                    │ │ Brugt          1.310 / 1.638 kr     │ │ 5% af indtægter   │
 * │                    │ │ Tilbage    +115 / +143 kr (check) │ │                │
 * └────────────────────┘ └─────────────────────────────────────┘ └───────────────────┘
 *
 * Unfolded, under the boxes: Billetter (the ticket table named by type, its sums as its bottom rows down to
 * Rådighedsbeløb), this dinner as one spending row with its receipts under it, the team's round in the same shape
 * (CookingRoundSpending; the card builds both fragments once and hands them in) and last
 * Billetændringer (TicketChanges, folded behind its chevron, its window from the booking deadline), shown only while
 * the dinner has tickets.
 *
 * Ticket money is what the households pay and reads in plain kr; every other amount renders both units through
 * VatAmount, the ex moms figure loud. Revenue counts every paid ticket, a released one included (useOrder.calculateBudget).
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
import type { SpendingFragment } from '~/composables/useBookingUi'
import type {TableColumn} from '@nuxt/ui'

interface Props {
  orders: OrderDetail[]
  mode?: 'compact' | 'full'
  expenses?: Expense[]
  dinnerEventId?: number | null
  bookingDeadline?: Date | null
  dinnerFragment?: SpendingFragment | null
  teamFragment?: SpendingFragment | null
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'compact',
  expenses: () => [],
  dinnerEventId: null,
  bookingDeadline: null,
  dinnerFragment: null,
  teamFragment: null
})

const { TYPOGRAPHY, COMPONENTS, ICONS, BUTTONS, COLOR, NOISE, SIZES, ALERTS, getRandomEmptyMessageText } = useTheSlopeDesignSystem()
const noTicketsSold = getRandomEmptyMessageText('noTicketsSold')

// Kitchen config from app.config.ts
const appConfig = useAppConfig()
const {baseRatePercent: kitchenBaseRatePercent, vatPercent} = appConfig.theslope.kitchen

// Business logic from useOrder and useTicket
const { getActiveOrders, groupByTicketType, calculateBudget, calculateTotalPortions, spendingLeft, spendingAwaitsTickets } = useOrder()
const { formatPrice } = useTicket()

// Expandable details state
const showDetails = ref(false)

// Active orders (excluding RELEASED): the kitchen's eaters
const activeOrders = computed(() => getActiveOrders(props.orders))

// Budget calculations from composable (business logic)
const budget = computed(() => calculateBudget(props.orders, kitchenBaseRatePercent, vatPercent))

const totalPortions = computed(() => calculateTotalPortions(props.orders))

// Revenue by ticket type (for expanded details table)
const revenueByType = computed(() => groupByTicketType(activeOrders.value))

// The grocery lines against the allowance
const spent = computed(() => sumAmounts(props.expenses))
const figures = computed(() => ({budgetGross: budget.value.availableBudget, spentGross: spent.value}))
const left = computed(() => spendingLeft(figures.value))

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
    <!-- The pane's title with the chevron that opens the details below -->
    <div :class="COMPONENTS.collapsible.headerRow">
      <h4 :class="TYPOGRAPHY.sectionSubheading">Budget</h4>
      <UButton
        v-bind="BUTTONS.flipOpen(showDetails)"
        :color="COLOR.neutral"
        :variant="NOISE.quiet"
        :size="SIZES.standard"
        :aria-label="showDetails ? 'Skjul budgettet' : 'Vis budgettet'"
        name="toggle-budget-details"
        @click="showDetails = !showDetails"
      />
    </div>

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
            <UIcon :name="ICONS.household" :class="COMPONENTS.dinnerBudget.boxGlyph" />
            <span :class="COMPONENTS.dinnerBudget.boxLabelText">KØKKENBIDRAG</span>
          </div>
          <div :class="COMPONENTS.dinnerBudget.boxAmountLarge"><VatAmount :gross="budget.kitchenContribution" /></div>
          <div :class="COMPONENTS.dinnerBudget.boxUnit">ex / inkl. moms</div>
          <div :class="COMPONENTS.dinnerBudget.boxUnit">{{ budget.kitchenBaseRatePercent }}% af indtægter</div>
        </div>
      </UCard>
    </div>

    <!-- The details, below the boxes -->
    <UCollapsible v-model:open="showDetails" v-bind="COMPONENTS.collapsible.belowTrigger">
      <template #content>
    <div data-testid="budget-details">
      <!-- Billetter: the ticket table named by type -->
      <UTable :data="revenueByType" :columns="ticketColumns" :ui="COMPONENTS.table.ui" data-testid="budget-ticket-table">
        <template #ticketType-cell="{ row }">{{ ticketTypeLabel(row.original.ticketType) }}</template>
        <template #unitPrice-cell="{ row }">{{ formatPrice(row.original.unitPrice) }} kr</template>
        <template #revenue-cell="{ row }">{{ formatPrice(row.original.revenue) }} kr</template>
        <template #empty>
          <UAlert v-bind="ALERTS.emptyStateCompact" :title="noTicketsSold" data-testid="budget-ticket-empty" />
        </template>
        <template #body-bottom>
          <tr :class="COMPONENTS.table.totalRow" data-testid="budget-summary-revenue">
            <td :class="COMPONENTS.table.sumCell" colspan="3">Indtægter</td>
            <td :class="COMPONENTS.table.sumAmountCell">{{ formatPrice(budget.totalRevenue) }} kr</td>
          </tr>
          <tr>
            <td :class="COMPONENTS.table.sumCell" colspan="3">Køkkenbidrag ({{ budget.kitchenBaseRatePercent }}%)</td>
            <td :class="COMPONENTS.table.sumAmountCell"><span :class="COMPONENTS.dinnerBudget.summaryDeduction">-<VatAmount :gross="budget.kitchenContribution" /></span></td>
          </tr>
          <tr :class="COMPONENTS.table.totalRow" data-testid="budget-summary-available">
            <td :class="COMPONENTS.table.sumCell" colspan="3">Rådighedsbeløb</td>
            <td :class="COMPONENTS.table.sumAmountCell"><VatAmount :gross="budget.availableBudget" /></td>
          </tr>
        </template>
      </UTable>

      <!-- This dinner: its receipts under its heading, its figures in the total row -->
      <div v-if="dinnerFragment" :class="COMPONENTS.dinnerBudget.section">
        <CookingRoundSpending :fragment="dinnerFragment" />
      </div>

      <!-- The team's cooking round -->
      <div v-if="teamFragment" :class="COMPONENTS.dinnerBudget.section">
        <CookingRoundSpending :fragment="teamFragment" />
      </div>

      <!-- Billetændringer last, folded, only while there are tickets -->
      <div v-if="dinnerEventId && orders.length" :class="COMPONENTS.dinnerBudget.section">
        <TicketChanges :dinner-event-id="dinnerEventId" :since="bookingDeadline" />
      </div>
    </div>
      </template>
    </UCollapsible>
  </div>
</template>
