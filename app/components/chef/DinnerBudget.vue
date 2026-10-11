<script setup lang="ts">
/**
 * DinnerBudget - Financial overview for dinner event
 *
 * Compact mode (in ChefMenuCard summary line):
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 💰 1.425 kr                                                              │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Full mode, folded (title + 3 boxes, one chevron):
 * Budget                                                                    [>]
 * ┌ 💰 INDTÆGTER ──────┐ ┌ 🛒 RÅDIGHEDSBELØB ─────────────────┐ ┌ 🏠 KØKKENBIDRAG ──┐
 * │ 1.500 / 1.875 kr   │ │ 1.425 / 1.781 kr                    │ │ 75 / 94 kr        │
 * │ ex / inkl. moms    │ │ ex / inkl. moms                     │ │ ex / inkl. moms   │
 * │ 45 kuverter        │ │ Brugt          1.310 / 1.638 kr     │ │ 5% af indtægter   │
 * │                    │ │ Til rådighed    +115 / +143 kr (check) │ │                │
 * └────────────────────┘ └─────────────────────────────────────┘ └───────────────────┘
 *
 * Unfolded, under the boxes: Billetter (the ticket table named by type, Indtægter, Køkkenbidrag, Rådighedsbeløb,
 * Brugt, Til rådighed), Billetændringer (TicketChanges, lazy) and the team's round (CookingRoundSpending).
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
import type { CookingRoundRow } from '~/composables/useBookingUi'

interface Props {
  orders: OrderDetail[]
  mode?: 'compact' | 'full'
  expenses?: Expense[]
  dinnerEventId?: number | null
  menuDeadline?: Date | null
  roundRows?: CookingRoundRow[]
  roundLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'compact',
  expenses: () => [],
  dinnerEventId: null,
  menuDeadline: null,
  roundRows: () => [],
  roundLabel: ''
})

const { TYPOGRAPHY, COMPONENTS, ICONS } = useTheSlopeDesignSystem()

// Kitchen config from app.config.ts
const appConfig = useAppConfig()
const kitchenBaseRatePercent = appConfig.theslope?.kitchen?.baseRatePercent ?? 5
const vatPercent = appConfig.theslope?.kitchen?.vatPercent ?? 25

// Business logic from useOrder and useTicket
const { getActiveOrders, groupByTicketType, calculateBudget, calculateTotalPortionsFromPrices } = useOrder()
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
const left = computed(() => budget.value.availableBudget - spent.value)
</script>

<template>
  <!-- Compact Mode -->
  <div v-if="mode === 'compact'" :class="COMPONENTS.dinnerBudget.compact">
    <span>💰</span>
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
            <span>💰</span>
            <span>INDTÆGTER</span>
          </div>
          <div :class="COMPONENTS.dinnerBudget.boxAmountLarge"><VatAmount :gross="budget.totalRevenue" /></div>
          <div :class="COMPONENTS.dinnerBudget.boxUnit">ex / inkl. moms</div>
          <div :class="COMPONENTS.dinnerBudget.unit">
            {{ formatPortions(totalPortions) }} kuverter
          </div>
        </div>
      </UCard>

      <!-- Box 2: Rådighedsbeløb (Available Budget): start, used, left -->
      <UCard :ui="COMPONENTS.dinnerBudget.boxUi" data-testid="budget-box-available">
        <div :class="COMPONENTS.dinnerBudget.box">
          <div :class="COMPONENTS.dinnerBudget.boxLabel">
            <span>🛒</span>
            <span>RÅDIGHEDSBELØB</span>
          </div>
          <div :class="COMPONENTS.dinnerBudget.boxAmountLarge"><VatAmount :gross="budget.availableBudget" /></div>
          <div :class="COMPONENTS.dinnerBudget.boxUnit">ex / inkl. moms</div>
          <div :class="COMPONENTS.dinnerBudget.boxLine">
            <span>Brugt</span>
            <VatAmount :gross="spent" data-testid="budget-spent" />
          </div>
          <div :class="COMPONENTS.dinnerBudget.boxLine">
            <span>Til rådighed</span>
            <VatAmount :gross="left" balance data-testid="budget-left" />
          </div>
        </div>
      </UCard>

      <!-- Box 3: Køkkenbidrag (Kitchen Contribution) -->
      <UCard :ui="COMPONENTS.dinnerBudget.boxUi" data-testid="budget-box-contribution">
        <div :class="COMPONENTS.dinnerBudget.box">
          <div :class="COMPONENTS.dinnerBudget.boxLabel">
            <span>🏠</span>
            <span>KØKKENBIDRAG</span>
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
      <div :class="COMPONENTS.dinnerBudget.tableScroll">
        <table :class="COMPONENTS.dinnerBudget.table">
          <thead>
            <tr :class="COMPONENTS.dinnerBudget.tableHead">
              <th :class="COMPONENTS.dinnerBudget.th">Billettype</th>
              <th :class="COMPONENTS.dinnerBudget.thRight">Antal</th>
              <th :class="COMPONENTS.dinnerBudget.thRight">Stk pris</th>
              <th :class="COMPONENTS.dinnerBudget.thRight">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="group in revenueByType"
              :key="group.ticketType"
              :class="COMPONENTS.dinnerBudget.tr"
              data-testid="budget-ticket-row"
            >
              <td :class="COMPONENTS.dinnerBudget.td">{{ ticketLabel(group.ticketType) }}</td>
              <td :class="COMPONENTS.dinnerBudget.tdRight">{{ group.count }}</td>
              <td :class="COMPONENTS.dinnerBudget.tdRight"><VatAmount :gross="group.unitPrice" /></td>
              <td :class="COMPONENTS.dinnerBudget.tdTotal"><VatAmount :gross="group.revenue" /></td>
            </tr>
            <!-- Empty state row when no tickets -->
            <tr v-if="revenueByType.length === 0">
              <td :class="COMPONENTS.dinnerBudget.tdEmpty" colspan="4">
                Ingen billetter solgt endnu
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Summary lines -->
      <div :class="COMPONENTS.dinnerBudget.summary">
        <div :class="COMPONENTS.dinnerBudget.unitHeader">ex / inkl. moms</div>
        <div :class="COMPONENTS.dinnerBudget.summaryRow">
          <span :class="TYPOGRAPHY.bodyTextMuted">Indtægter</span>
          <VatAmount :gross="budget.totalRevenue" />
        </div>
        <div :class="COMPONENTS.dinnerBudget.summaryRow">
          <span :class="TYPOGRAPHY.bodyTextMuted">Køkkenbidrag ({{ budget.kitchenBaseRatePercent }}%)</span>
          <span :class="COMPONENTS.dinnerBudget.summaryDeduction">-<VatAmount :gross="budget.kitchenContribution" /></span>
        </div>
        <div :class="COMPONENTS.dinnerBudget.summaryTotalRow">
          <span>Rådighedsbeløb</span>
          <VatAmount :gross="budget.availableBudget" />
        </div>
        <div :class="COMPONENTS.dinnerBudget.summaryRow">
          <span :class="TYPOGRAPHY.bodyTextMuted">Brugt</span>
          <VatAmount :gross="spent" />
        </div>
        <div :class="COMPONENTS.dinnerBudget.summaryRow">
          <span :class="TYPOGRAPHY.bodyTextMuted">Til rådighed</span>
          <VatAmount :gross="left" balance data-testid="budget-summary-left" />
        </div>
        <TicketChanges v-if="dinnerEventId" :dinner-event-id="dinnerEventId" :since="menuDeadline" />
      </div>

      <!-- The team's cooking round -->
      <div v-if="roundRows.length" :class="COMPONENTS.dinnerBudget.section">
        <CookingRoundSpending :label="roundLabel" :rows="roundRows" />
      </div>
    </div>
  </div>
</template>
