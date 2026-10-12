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
 * The team's round: its heading, the cooking days as the rows, the team's total row
 *   Hele Madhold 2, for perioden 12/04–15/04                  ex / inkl. moms
 *   12/04  Lasagne          1.425 / 1.781 kr  1.540 / 1.925 kr  -115 / -144 kr (overdraft)
 *   14/04  (arrow) Risotto  1.498 / 1.873 kr  1.310 / 1.638 kr  +188 / +235 kr (check)
 *   15/04  Pasta                0 /     0 kr      0 /     0 kr      0 /     0 kr (waiting)
 *   Hele Madhold 2          2.923 / 3.654 kr  2.850 / 3.563 kr   +73 /  +91 kr (check)
 *
 * The arrow marks the dinner on view among the team's days; a figure without tickets waits instead of balancing; a
 * fragment without rows shows the table's own empty state. A UTable on the table token; the fragment comes from
 * dinnerSpendingFragment or teamSpendingFragment and every figure from the useOrder spending helpers.
 */
import type {TableColumn} from '@nuxt/ui'
import type {SpendingFragment, SpendingTableRow} from '~/composables/useBookingUi'

defineProps<{
  fragment: SpendingFragment
}>()

const {COMPONENTS, ICONS, TYPOGRAPHY, ALERTS, getRandomEmptyMessage} = useTheSlopeDesignSystem()
const noReceipts = getRandomEmptyMessage('noReceipts')
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
    <div :class="COMPONENTS.dinnerBudget.boxLine">
      <h5 :class="TYPOGRAPHY.sectionSubheading" data-testid="cooking-round-heading">{{ fragment.heading }}</h5>
      <span :class="COMPONENTS.vatAmount.unitHeader">ex / inkl. moms</span>
    </div>
    <UTable :data="fragment.rows" :columns="columns" :ui="COMPONENTS.table.ui">
      <template #date-cell="{ row }">{{ formatDate(row.original.date) }}</template>
      <template #label-cell="{ row }">
        <template v-if="row.original.kind === 'dinner'">
          <UIcon v-if="row.original.isCurrent" :name="ICONS.arrowRight" :class="COMPONENTS.table.currentMarker" data-testid="cooking-round-marker" />
          {{ row.original.menuTitle }}
        </template>
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
        <UAlert v-bind="ALERTS.emptyStateCompact" :title="`${noReceipts.emoji} ${noReceipts.text}`" data-testid="cooking-round-empty" />
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
