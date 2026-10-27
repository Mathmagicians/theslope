<script setup lang="ts">
/**
 * CookingRoundSpending - one spending table, Dato, Middag, Rådighedsbeløb, Brugt, Tilbage, rendering a fragment:
 *
 * This dinner: its heading, its receipts as the rows, its figures in the total row
 *   Risotto, 14/04                                            ex / inkl. moms
 *   Dato   Middag            Rådighedsbeløb      Brugt         Tilbage
 *   12/04  Anna H.                              1.012 / 1.265 kr
 *   14/04  Bo K.                                  298 /   373 kr
 *   Risotto                 1.498 / 1.873 kr  1.310 / 1.638 kr  +188 / +235 kr (check)
 *
 * The team's round: the team's badge and the period as its heading, the cooking days as the rows, the team's total row
 *   [(team) Madhold 2] periode 12/04-15/04                     ex / inkl. moms
 *   Dato   Middag            Rådighedsbeløb    Brugt             Tilbage
 *   12/04  Lasagne           1.425 / 1.781 kr  1.540 / 1.925 kr  -115 / -144 kr
 *   14/04  (dot) **Risotto** 1.498 / 1.873 kr  1.310 / 1.638 kr  +188 / +235 kr
 *   15/04  Pasta                 0 /     0 kr      0 /     0 kr      0 /     0 kr
 *   Madhold 2                2.923 / 3.654 kr  2.850 / 3.563 kr   +73 /  +91 kr
 * [(team) Madhold 2] is the team's colour badge (CookingTeamBadges, name only). (dot) **Risotto** is the dinner on view.
 *
 * A dinner without a menu title reads Fællesspisning (formatDinnerName) in its heading, its total row and its Middag cell:
 *   Fællesspisning, 10/11                                     ex / inkl. moms
 *   Dato   Middag            Rådighedsbeløb      Brugt         Tilbage
 *   Fællesspisning           1.498 / 1.873 kr       0 /    0 kr  ...
 *
 *   [(team) Madhold 2] periode 03/11-10/11                     ex / inkl. moms
 *   Dato   Middag            Rådighedsbeløb    Brugt             Tilbage
 *   03/11  Lasagne           1.425 / 1.781 kr  1.540 / 1.925 kr  ...
 *   10/11  Fællesspisning    1.498 / 1.873 kr       0 /    0 kr  ...
 *   Madhold 2                  ...
 *
 * While the round's orders load (the bookings store), UTable's loading bar runs under the team's round's column
 * headers and its days and total row stay; this dinner's receipts come from the dinner and carry no bar:
 *   [(team) Madhold 2] periode 12/04-15/04                     ex / inkl. moms
 *   Dato  Middag           Rådighedsbeløb      Brugt         Tilbage
 *   ==============================================================  <- UTable's loading bar
 *   12/04  Lasagne          1.425 / 1.781 kr  1.540 / 1.925 kr  -115 / -144 kr (overdraft)
 *
 * On a box narrower than the heading line (a phone), the unit words drop below the heading, on the right:
 *   [(team) Madhold 2] periode 11/11-12/11
 *                         ex / inkl. moms
 *
 * A dot and the bold name mark the dinner on view among the team's days, on one line; a figure without tickets waits
 * instead of balancing; a fragment without rows shows the table's own empty state. A UTable on the table token; the
 * fragment comes from dinnerSpendingFragment or teamSpendingFragment and every figure from the useOrder spending helpers.
 */
import type {TableColumn} from '@nuxt/ui'
import type {SpendingFragment, SpendingTableRow} from '~/composables/useBookingUi'

const props = defineProps<{
  fragment: SpendingFragment
}>()

const {COMPONENTS, ICONS, TYPOGRAPHY, ALERTS, getRandomEmptyMessageText} = useTheSlopeDesignSystem()

// A team's cooking days read their allowance off the round's orders; this dinner's rows are its receipts
const {isOrdersLoading} = storeToRefs(useBookingsStore())
const loading = computed(() => isOrdersLoading.value && props.fragment.rows.some(row => row.kind === 'dinner'))
const now = useClock()
const noReceipts = getRandomEmptyMessageText('noReceipts', now.value)
const {spendingLeft, spendingAwaitsTickets} = useOrder()

const columns: TableColumn<SpendingTableRow>[] = [
  {id: 'date', header: 'Dato'},
  {id: 'label', header: 'Middag'},
  {id: 'allowance', header: 'Rådighedsbeløb', meta: COMPONENTS.table.amountColumn},
  {id: 'spent', header: 'Brugt', meta: COMPONENTS.table.amountColumn},
  {id: 'left', header: 'Tilbage', meta: COMPONENTS.table.amountColumn}
]
</script>

<template>
  <section data-testid="cooking-round">
    <div :class="COMPONENTS.dinnerBudget.headingLine">
      <div v-if="fragment.kind === 'team'" :class="COMPONENTS.dinnerBudget.roundHeading" data-testid="cooking-round-heading">
        <CookingTeamBadges :team-number="fragment.teamNumber" :team-name="fragment.team" :show-counts="false" />
        <span :class="TYPOGRAPHY.sectionSubheading">{{ fragment.period }}</span>
      </div>
      <h5 v-else :class="TYPOGRAPHY.sectionSubheading" data-testid="cooking-round-heading">{{ fragment.heading }}</h5>
      <span :class="COMPONENTS.dinnerBudget.headingUnits">ex / inkl. moms</span>
    </div>
    <UTable :data="fragment.rows" :columns="columns" :loading="loading" :ui="COMPONENTS.table.ui">
      <template #date-cell="{ row }">{{ formatDate(row.original.date, DATE_SETTINGS.DAY_MONTH_MASK) }}</template>
      <template #label-cell="{ row }">
        <span v-if="row.original.kind === 'dinner'" :class="row.original.isCurrent ? COMPONENTS.table.currentDinnerLabel : COMPONENTS.table.dinnerLabel">
          <UIcon v-if="row.original.isCurrent" :name="ICONS.dot" :class="COMPONENTS.table.currentMarker" data-testid="cooking-round-marker" />
          {{ formatDinnerName(row.original) }}
        </span>
        <span v-else :class="COMPONENTS.table.receiptLabel">{{ row.original.label }}</span>
      </template>
      <template #allowance-cell="{ row }">
        <VatAmount v-if="row.original.kind === 'dinner'" :gross="row.original.budgetGross" />
      </template>
      <template #spent-cell="{ row }">
        <VatAmount v-if="row.original.kind === 'dinner'" :gross="row.original.spentGross" />
        <VatAmount v-else :gross="row.original.amount" />
      </template>
      <template #left-cell="{ row }">
        <VatAmount v-if="row.original.kind === 'dinner'" :gross="spendingLeft(row.original)" balance :pending="spendingAwaitsTickets(row.original)" />
      </template>
      <template #empty>
        <UAlert v-bind="ALERTS.emptyStateCompact" :title="noReceipts" data-testid="cooking-round-empty" />
      </template>
      <template #body-bottom>
        <tr :class="COMPONENTS.table.totalRow" data-testid="cooking-round-total">
          <td :class="COMPONENTS.table.sumCell" colspan="2">{{ fragment.total.label }}</td>
          <td :class="COMPONENTS.table.sumAmountCell"><VatAmount :gross="fragment.total.figures.budgetGross" /></td>
          <td :class="COMPONENTS.table.sumAmountCell"><VatAmount :gross="fragment.total.figures.spentGross" /></td>
          <td :class="COMPONENTS.table.sumAmountCell"><VatAmount :gross="spendingLeft(fragment.total.figures)" balance :pending="spendingAwaitsTickets(fragment.total.figures)" /></td>
        </tr>
      </template>
    </UTable>
  </section>
</template>
