<script setup lang="ts">
/**
 * ExpenseLines - the grocery lines behind a cost, as a section row of the chef card.
 *
 * Folded, one row like the card's other sections:
 *   (cart) MADBESTILLING   1.310 / 1.638 kr                      [Rediger madbestilling]   <- or the empty text
 *
 * Open, the editor the button reveals: the action first, the lines, then the sums with a rule above each result
 *   Hvad kostede indkøbene?                                                                           [Luk]
 *   [ beløb      ] [ Ex moms v ] [ "Risotto" 14/04/2026, Anna H. bestiller for Madhold 2 ] [Tilføj]
 *   Dato   Bestiller  Note                                                 ex / inkl. moms
 *   12/04  Anna H.    "Risotto" 14/04/2026, Anna H. bestiller for Madhold 2  1.012 / 1.265 kr   [slet]
 *   ──────────────────────────────────────────────────────────────────
 *   Rådighedsbeløb                                   1.425 / 1.781 kr
 *   Brugt                                            1.310 / 1.638 kr
 *   ──────────────────────────────────────────────────────────────────
 *   Tilbage                                           +115 /  +143 kr (check)
 *
 *   ──────────────────────────────────────────────────────────────────
 *   Hele Madhold 2, periode 12/04–14/04
 *   Rådighedsbeløb                                   4.435 / 5.544 kr
 *   Brugt                                            4.245 / 5.307 kr
 *   ──────────────────────────────────────────────────────────────────
 *   Tilbage                                           +190 /  +237 kr (check)
 *
 * A line saves as it is added and goes as it is removed; Luk folds the row. The helping numbers follow the lines.
 * The reporting user is the payer. The note field starts with the words handed in as notePrefill when the editor
 * opens and after each Tilføj; the form sends the note as typed and leaves it out when the field is empty, and the
 * route writes the prefill's words for a body without one. The same section serves the kitchen's own purchases with
 * its own title, hint and texts.
 *
 * Tokens: the folded row and the editor head bind cardSection like the allergen row; the edit button is
 * BUTTONS.secondaryAction, Luk BUTTONS.cancel, Tilføj BUTTONS.save, slet BUTTONS.remove; every amount is a VatAmount
 * in the expenseLines grid; the whole-team heading is the text cookingRoundWords builds, shared with CookingRoundSpending.
 */
import type {Expense, ExpenseCreate, ExpenseLineForm, VatMode} from '~/composables/useBillingValidation'
import type {SpendingFigures} from '~/composables/useOrder'
import {allowanceRows} from '~/composables/useBookingUi'
import type {NuxtUIColor} from '~/composables/useTheSlopeDesignSystem'
import type {Form, FormSubmitEvent, TableColumn} from '@nuxt/ui'

const props = withDefaults(defineProps<{
  expenses: Expense[]
  title: string
  hint: string
  emptyText: string
  editLabel: string
  glyph?: string
  color?: NuxtUIColor
  editable?: boolean
  pending?: boolean
  budgetGross?: number | null
  round?: {label: string, figures: SpendingFigures} | null
  notePrefill?: string
}>(), {
  glyph: undefined,
  color: undefined,
  editable: false,
  pending: false,
  budgetGross: null,
  round: null,
  notePrefill: ''
})

const emit = defineEmits<{
  add: [line: ExpenseCreate]
  remove: [expenseId: number]
}>()

const {COMPONENTS, BUTTONS, ICONS, COLOR, LAYOUTS, SIZES, ALERTS, getRandomEmptyMessageText} = useTheSlopeDesignSystem()
const noReceipts = getRandomEmptyMessageText('noReceipts')
const {ExpenseLineFormSchema, VatModeSchema} = useBillingValidation()
const {formatPrice} = useTicket()
const {typedKrToGrossOre, typedKrOtherUnitOre} = useOrder()
const appConfig = useAppConfig()
const vatPercent = appConfig.theslope?.kitchen?.vatPercent ?? 25
const VatModeValue = VatModeSchema.enum
const vatModeItems = [
  {value: VatModeValue.inkl, label: 'Inkl. moms'},
  {value: VatModeValue.ex, label: 'Ex moms'}
]

const glyphName = computed(() => props.glyph ?? ICONS.shoppingCart)
const buttonColor = computed(() => props.color ?? COLOR.primary)
const isOpen = ref(false)
// The note starts from the prefill each time the editor opens; the prefill follows the dinner on view
const openEditor = () => {
  draft.note = props.notePrefill
  isOpen.value = true
}

// The receipt states one unit; the chef types that unit, the line is stored gross
const isExVat = (vatMode: VatMode) => vatMode === VatModeValue.ex

const draft = reactive<{amountKr: number | undefined, vatMode: VatMode, note: string}>({amountKr: undefined, vatMode: VatModeValue.ex, note: ''})
const formRef = useTemplateRef<Form<ExpenseLineForm>>('formRef')

const alternative = computed(() => {
  const kr = Number(draft.amountKr)
  if (!(kr > 0)) return null
  const other = formatPrice(typedKrOtherUnitOre(kr, isExVat(draft.vatMode), vatPercent))
  return isExVat(draft.vatMode) ? `= ${other} kr inkl. moms` : `= ${other} kr ex moms`
})

const handleSubmit = ({data}: FormSubmitEvent<ExpenseLineForm>) => {
  const amount = typedKrToGrossOre(data.amountKr, isExVat(data.vatMode), vatPercent)
  emit('add', data.note ? {amount, description: data.note} : {amount})
  draft.amountKr = undefined
  draft.note = props.notePrefill
}

const spent = computed(() => sumAmounts(props.expenses))
// The sums under the lines (Brugt alone without a budget to hold them against), and the whole team's under its heading
const sumRows = computed(() => allowanceRows({budgetGross: props.budgetGross, spentGross: spent.value}))
const roundRows = computed(() => props.round ? allowanceRows(props.round.figures) : [])
const lineColumns: TableColumn<Expense>[] = [
  {id: 'date', header: 'Dato'},
  {id: 'payer', header: 'Bestiller'},
  {id: 'note', header: 'Note'},
  {id: 'amount', header: 'ex / inkl. moms', meta: COMPONENTS.table.amountColumn},
  {id: 'remove', header: ''}
]
</script>

<template>
  <section data-testid="expense-lines">
    <div v-if="!isOpen" :class="COMPONENTS.cardSection.row" data-testid="expense-row">
      <span :class="COMPONENTS.cardSection.label">
        <UIcon :name="glyphName" :class="COMPONENTS.cardSection.glyph" />
        {{ title }}
      </span>
      <div :class="COMPONENTS.cardSection.line">
        <template v-if="expenses.length">
          <VatAmount :gross="spent" data-testid="expense-total" />
          <span :class="COMPONENTS.vatAmount.unitHeader">ex / inkl. moms</span>
        </template>
        <span v-else :class="COMPONENTS.expenseLines.empty" data-testid="expense-empty">{{ emptyText }}</span>
      </div>
      <UButton
        v-if="editable"
        v-bind="BUTTONS.secondaryAction"
        :class="LAYOUTS.cardActionButton"
        :color="buttonColor"
        :icon="ICONS.edit"
        :disabled="pending"
        data-testid="expense-edit"
        @click="openEditor"
      >
        {{ editLabel }}
      </UButton>
    </div>

    <div v-else :class="COMPONENTS.cardSection.editor" data-testid="expense-editor">
      <div :class="COMPONENTS.cardSection.editorHead">
        <h4 :class="COMPONENTS.cardSection.editorTitle">{{ hint }}</h4>
        <div :class="LAYOUTS.formButtonRow">
          <UButton v-bind="BUTTONS.cancel" data-testid="expense-back" @click="isOpen = false">Luk</UButton>
        </div>
      </div>

      <UForm
        ref="formRef"
        :state="draft"
        :schema="ExpenseLineFormSchema"
        :class="COMPONENTS.expenseLines.form"
        data-testid="expense-form"
        @submit="handleSubmit"
      >
        <div :class="COMPONENTS.expenseLines.formRow">
          <UFormField name="amountKr" :class="COMPONENTS.expenseLines.amountField">
            <UInput v-model.number="draft.amountKr" type="number" min="0" placeholder="beløb" name="expense-amount-input" :size="SIZES.small" :class="COMPONENTS.expenseLines.control" />
          </UFormField>
          <UFormField name="vatMode" :class="COMPONENTS.expenseLines.vatField">
            <USelect v-model="draft.vatMode" :items="vatModeItems" value-key="value" name="expense-vat-select" :size="SIZES.small" :class="COMPONENTS.expenseLines.control" />
          </UFormField>
          <UFormField name="note" :class="COMPONENTS.expenseLines.noteField">
            <UInput v-model="draft.note" placeholder="note" name="expense-note-input" :size="SIZES.small" :class="COMPONENTS.expenseLines.control" />
          </UFormField>
          <UButton v-bind="BUTTONS.save" :size="SIZES.small" :loading="pending" :disabled="pending" data-testid="expense-add" @click="formRef?.submit()">
            Tilføj
          </UButton>
        </div>
        <div v-if="alternative" :class="COMPONENTS.expenseLines.alternative" data-testid="expense-alternative">{{ alternative }}</div>
      </UForm>

      <!-- The lines and, as the table's bottom rows, the sums: this dinner's, then the whole team's set apart -->
      <UTable :data="expenses" :columns="lineColumns" :ui="COMPONENTS.table.ui" data-testid="expense-table">
        <template #date-cell="{ row }">{{ formatDate(row.original.createdAt, DATE_SETTINGS.DAY_MONTH_MASK) }}</template>
        <template #payer-cell="{ row }"><span :class="COMPONENTS.expenseLines.textCell" data-testid="expense-payer">{{ row.original.paidBy.name ?? '' }}</span></template>
        <template #note-cell="{ row }"><span :class="COMPONENTS.expenseLines.textCell" data-testid="expense-note">{{ row.original.description }}</span></template>
        <template #amount-cell="{ row }"><VatAmount :gross="row.original.amount" /></template>
        <template #remove-cell="{ row }">
          <UButton v-bind="BUTTONS.remove" aria-label="Slet" :disabled="pending" data-testid="expense-remove" @click="emit('remove', row.original.id)" />
        </template>
        <template #empty>
          <UAlert v-bind="ALERTS.emptyStateCompact" :title="noReceipts" data-testid="expense-table-empty" />
        </template>
        <template #body-bottom>
          <!-- The first sum row carries the rule that parts the lines from their sums -->
          <tr v-for="(row, index) in sumRows" :key="row.label" :class="row.rule || index === 0 ? COMPONENTS.table.totalRow : ''" data-testid="expense-hint-row">
            <td :class="COMPONENTS.table.sumCell" colspan="3">{{ row.label }}</td>
            <td :class="COMPONENTS.table.sumAmountCell"><VatAmount :gross="row.gross" :balance="row.balance" :pending="row.pending" /></td>
            <td :class="COMPONENTS.table.sumCell" />
          </tr>
          <template v-if="round">
            <tr><td :class="COMPONENTS.table.spacerCell" colspan="5" /></tr>
            <tr :class="COMPONENTS.table.totalRow" data-testid="expense-hint-heading">
              <td :class="COMPONENTS.table.sumCell" colspan="5">{{ round.label }}</td>
            </tr>
            <tr v-for="row in roundRows" :key="row.label" :class="row.rule ? COMPONENTS.table.totalRow : ''" data-testid="expense-hint-row">
              <td :class="COMPONENTS.table.sumCell" colspan="3">{{ row.label }}</td>
              <td :class="COMPONENTS.table.sumAmountCell"><VatAmount :gross="row.gross" :balance="row.balance" :pending="row.pending" /></td>
              <td :class="COMPONENTS.table.sumCell" />
            </tr>
          </template>
        </template>
      </UTable>
    </div>
  </section>
</template>
