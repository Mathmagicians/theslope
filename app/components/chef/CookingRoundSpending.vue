<script setup lang="ts">
/**
 * CookingRoundSpending - one spending table, Dato, Middag, Rådighedsbeløb, Brugt, Tilbage, in two uses:
 *
 * This dinner, one row with its receipts as sub-rows (no heading, no total row):
 *                                                          ex / inkl. moms
 *   Dato   Middag            Rådighedsbeløb      Brugt         Tilbage
 *   14/04  (arrow) Risotto    1.498 / 1.873 kr  1.310 / 1.638 kr  +188 / +235 kr (check)
 *   12/04     Anna H.                         1.012 / 1.265 kr
 *   14/04     Bo K.                             298 /   373 kr
 *
 * The team's round, headed by its words, the team's total row last:
 *   Hele Madhold 2, for perioden 12/04–15/04                 ex / inkl. moms
 *   12/04  Lasagne          1.425 / 1.781 kr  1.540 / 1.925 kr  -115 / -144 kr (overdraft)
 *   14/04  (arrow) Risotto    1.498 / 1.873 kr  1.310 / 1.638 kr  +188 / +235 kr (check)
 *   15/04  Pasta                0 /     0 kr      0 /     0 kr      0 /     0 kr (waiting)
 *   Hele Madhold 2          2.923 / 3.654 kr  2.850 / 3.563 kr   +73 /  +91 kr (check)
 *
 * An arrow before the name marks the dinner on view; a dinner without tickets waits instead of balancing. A UTable on
 * the table token; the rows come from spendingTableRows and every figure from the useOrder spending helpers.
 */
import type {TableColumn} from '@nuxt/ui'
import type {Expense} from '~/composables/useBillingValidation'
import {spendingTableRows, type CookingRoundWords, type SpendingTableRow} from '~/composables/useBookingUi'

const props = withDefaults(defineProps<{
  words: CookingRoundWords | null
  rows: CookingRoundRow[]
  receipts?: Expense[] | null
  emptyText?: string
}>(), {
  receipts: null,
  emptyText: 'Madbestilling mangler'
})

const {COMPONENTS, ICONS} = useTheSlopeDesignSystem()
const {spendingTotals, spendingLeft, spendingAwaitsTickets} = useOrder()

const columns: TableColumn<SpendingTableRow>[] = [
  {id: 'date', header: 'Dato'},
  {id: 'label', header: 'Middag'},
  {id: 'allowance', header: 'Rådighedsbeløb', meta: COMPONENTS.table.amountColumn},
  {id: 'spent', header: 'Brugt', meta: COMPONENTS.table.amountColumn},
  {id: 'left', header: 'Tilbage', meta: COMPONENTS.table.amountColumn}
]

const tableRows = computed(() => spendingTableRows(props.rows, props.receipts, props.emptyText))
const totals = computed(() => spendingTotals(props.rows))
</script>

<template>
  <section data-testid="cooking-round">
    <div :class="COMPONENTS.dinnerBudget.boxLine">
      <h5 v-if="words" :class="COMPONENTS.dinnerBudget.sectionTitle" data-testid="cooking-round-heading">{{ words.heading }}</h5>
      <span v-else />
      <span :class="COMPONENTS.vatAmount.unitHeader">ex / inkl. moms</span>
    </div>
    <UTable :data="tableRows" :columns="columns" :ui="COMPONENTS.table.ui">
      <template #date-cell="{ row }">
        <template v-if="row.original.kind !== 'none'">{{ formatDate(row.original.date, 'dd/MM') }}</template>
      </template>
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
        <VatAmount v-else-if="row.original.kind === 'receipt'" :gross="row.original.amount" />
      </template>
      <template #left-cell="{ row }">
        <VatAmount v-if="row.original.kind === 'dinner'" :gross="spendingLeft(row.original)" balance :pending="spendingAwaitsTickets(row.original)" />
      </template>
      <template v-if="words" #body-bottom>
        <tr :class="COMPONENTS.table.totalRow" data-testid="cooking-round-total">
          <td :class="COMPONENTS.table.ui.td" colspan="2">{{ words.team }}</td>
          <td :class="[COMPONENTS.table.ui.td, COMPONENTS.table.amountColumn.class.td]"><VatAmount :gross="totals.budgetGross" /></td>
          <td :class="[COMPONENTS.table.ui.td, COMPONENTS.table.amountColumn.class.td]"><VatAmount :gross="totals.spentGross" /></td>
          <td :class="[COMPONENTS.table.ui.td, COMPONENTS.table.amountColumn.class.td]"><VatAmount :gross="spendingLeft(totals)" balance :pending="spendingAwaitsTickets(totals)" /></td>
        </tr>
      </template>
    </UTable>
  </section>
</template>
