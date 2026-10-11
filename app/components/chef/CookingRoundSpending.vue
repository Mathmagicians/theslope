<script setup lang="ts">
/**
 * CookingRoundSpending - the team's cooking round: one row per consecutive dinner with its allowance, its spending and
 * what is left, the current dinner marked, a total row with the team's name.
 *
 *   Madhold 2, 12/04–14/04                                   ex / inkl. moms
 *   Dato   Middag           Rådighedsbeløb        Brugt          Til rådighed
 *   12/04  Lasagne          1.425 / 1.781 kr  1.540 / 1.925 kr  -115 / -144 kr (exclamation icon)
 *   14/04  Risotto · denne  1.498 / 1.873 kr  1.310 / 1.638 kr  +188 / +235 kr
 *   Madhold 2               4.435 / 5.544 kr  4.245 / 5.307 kr  +190 / +237 kr (check icon)
 */
import type {CookingRoundRow} from '~/composables/useBookingUi'

const props = defineProps<{
  label: string
  rows: CookingRoundRow[]
}>()

const {COMPONENTS} = useTheSlopeDesignSystem()

const teamName = computed(() => props.label.split(',')[0] ?? props.label)
const totals = computed(() => props.rows.reduce(
  (sum, row) => ({budget: sum.budget + row.budgetGross, spent: sum.spent + row.spentGross}),
  {budget: 0, spent: 0}
))
</script>

<template>
  <section data-testid="cooking-round">
    <div :class="COMPONENTS.dinnerBudget.boxLine">
      <h5 :class="COMPONENTS.dinnerBudget.sectionTitle" data-testid="cooking-round-label">{{ label }}</h5>
      <span :class="COMPONENTS.vatAmount.unitHeader">ex / inkl. moms</span>
    </div>
    <table :class="COMPONENTS.cookingRound.table">
      <thead>
        <tr>
          <th :class="COMPONENTS.cookingRound.th">Dato</th>
          <th :class="COMPONENTS.cookingRound.th">Middag</th>
          <th :class="COMPONENTS.cookingRound.thRight">Rådighedsbeløb</th>
          <th :class="COMPONENTS.cookingRound.thRight">Brugt</th>
          <th :class="COMPONENTS.cookingRound.thRight">Til rådighed</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.dinnerEventId" :class="[COMPONENTS.cookingRound.tr, row.isCurrent ? COMPONENTS.cookingRound.current : '']" data-testid="cooking-round-row">
          <td :class="COMPONENTS.cookingRound.td">{{ formatDate(row.date, 'dd/MM') }}</td>
          <td :class="COMPONENTS.cookingRound.td">{{ row.menuTitle }}<template v-if="row.isCurrent"> · denne</template></td>
          <td :class="COMPONENTS.cookingRound.tdRight"><VatAmount :gross="row.budgetGross" /></td>
          <td :class="COMPONENTS.cookingRound.tdRight"><VatAmount :gross="row.spentGross" /></td>
          <td :class="COMPONENTS.cookingRound.tdRight"><VatAmount :gross="row.budgetGross - row.spentGross" balance /></td>
        </tr>
        <tr :class="COMPONENTS.cookingRound.total" data-testid="cooking-round-total">
          <td :class="COMPONENTS.cookingRound.td" colspan="2">{{ teamName }}</td>
          <td :class="COMPONENTS.cookingRound.tdRight"><VatAmount :gross="totals.budget" /></td>
          <td :class="COMPONENTS.cookingRound.tdRight"><VatAmount :gross="totals.spent" /></td>
          <td :class="COMPONENTS.cookingRound.tdRight"><VatAmount :gross="totals.budget - totals.spent" balance /></td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
