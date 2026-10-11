<script setup lang="ts">
/**
 * ExpenseLines - the grocery lines behind a cost, the entry row on top, one grid so amounts and remove buttons align.
 *
 *   INDKØBSOMKOSTNINGER                                   <- title prop
 *   Hvad kostede indkøbene?                               <- hint prop
 *   Til rådighed denne middag  +115 / +143 kr (check)   Madhold 2, 12/04–14/04  +190 / +238 kr (check)
 *   [ beløb       ] [ Ex moms v ] [Tilføj]               <- entry form, editable only
 *   = 1.265 kr inkl. moms                                <- the other unit of the typed amount
 *   Dato   Bestiller                      ex / inkl. moms
 *   12/04  Anna H.                      1.012 / 1.265 kr  [slet]
 *   14/04  Bo K.                          298 /   373 kr  [slet]
 *   Brugt                               1.310 / 1.638 kr
 *
 * Lines are stored gross and every figure renders both units (VatAmount). The reporting user is the payer and the
 * server writes the note, so the entry row carries the amount alone. The admin basisvarer ledger mounts the same
 * component with its own title and no helping numbers.
 */
import type {Form, FormSubmitEvent} from '@nuxt/ui'
import type {Expense, ExpenseCreate, ExpenseLineForm, VatMode} from '~/composables/useBillingValidation'

const props = withDefaults(defineProps<{
  expenses: Expense[]
  title: string
  hint?: string
  editable?: boolean
  pending?: boolean
  leftThisDinner?: number | null
  leftRound?: {label: string, gross: number} | null
}>(), {
  hint: '',
  editable: false,
  pending: false,
  leftThisDinner: null,
  leftRound: null
})

const emit = defineEmits<{
  add: [line: ExpenseCreate]
  remove: [expenseId: number]
}>()

const {COMPONENTS, BUTTONS, SIZES, TYPOGRAPHY} = useTheSlopeDesignSystem()
const {ExpenseLineFormSchema, VatModeSchema} = useBillingValidation()
const {formatPrice} = useTicket()
const {convertVat} = useOrder()
const appConfig = useAppConfig()
const vatPercent = appConfig.theslope?.kitchen?.vatPercent ?? 25

const VatModeValue = VatModeSchema.enum
const vatModeItems = [
  {value: VatModeValue.inkl, label: 'Inkl. moms'},
  {value: VatModeValue.ex, label: 'Ex moms'}
]

// The receipt states one unit; the chef types that unit, the line is stored gross
const toGrossOre = (amountKr: number, vatMode: VatMode): number =>
  vatMode === VatModeValue.ex ? convertVat(amountKr * 100, vatPercent, false) : Math.round(amountKr * 100)

const draft = reactive<{amountKr: number | undefined, vatMode: VatMode}>({amountKr: undefined, vatMode: VatModeValue.ex})
const formRef = useTemplateRef<Form<ExpenseLineForm>>('formRef')

const alternative = computed(() => {
  const kr = Number(draft.amountKr)
  if (!(kr > 0)) return null
  return draft.vatMode === VatModeValue.ex
    ? `= ${formatPrice(toGrossOre(kr, VatModeValue.ex))} kr inkl. moms`
    : `= ${formatPrice(convertVat(kr * 100, vatPercent, true))} kr ex moms`
})

const handleSubmit = ({data}: FormSubmitEvent<ExpenseLineForm>) => {
  emit('add', {amount: toGrossOre(data.amountKr, data.vatMode)})
  draft.amountKr = undefined
}

const spent = computed(() => sumAmounts(props.expenses))
</script>

<template>
  <section :class="COMPONENTS.expenseLines.stack" data-testid="expense-lines">
    <div>
      <h4 :class="COMPONENTS.expenseLines.title">{{ title }}</h4>
      <p v-if="hint" :class="TYPOGRAPHY.bodyTextMuted">{{ hint }}</p>
    </div>

    <div v-if="leftThisDinner !== null || leftRound" :class="COMPONENTS.expenseLines.helpers">
      <span v-if="leftThisDinner !== null" :class="COMPONENTS.expenseLines.helper" data-testid="expense-left-dinner">
        Til rådighed denne middag <VatAmount :gross="leftThisDinner" balance />
      </span>
      <span v-if="leftRound" :class="COMPONENTS.expenseLines.helper" data-testid="expense-left-round">
        {{ leftRound.label }} <VatAmount :gross="leftRound.gross" balance />
      </span>
    </div>

    <UForm
      v-if="editable"
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
        <UButton v-bind="BUTTONS.save" :size="SIZES.small" :loading="pending" :disabled="pending" data-testid="expense-add" @click="formRef?.submit()">
          Tilføj
        </UButton>
      </div>
      <div v-if="alternative" :class="COMPONENTS.expenseLines.alternative" data-testid="expense-alternative">{{ alternative }}</div>
    </UForm>

    <div :class="COMPONENTS.expenseLines.list">
      <div v-if="expenses.length" :class="COMPONENTS.expenseLines.row">
        <span :class="COMPONENTS.expenseLines.head">Dato</span>
        <span :class="COMPONENTS.expenseLines.head">Bestiller</span>
        <span :class="COMPONENTS.expenseLines.headRight">ex / inkl. moms</span>
        <span :class="COMPONENTS.expenseLines.removeSlot" />
      </div>
      <div v-for="expense in expenses" :key="expense.id" :class="COMPONENTS.expenseLines.row" data-testid="expense-line">
        <span :class="COMPONENTS.expenseLines.date">{{ formatDate(expense.createdAt, 'dd/MM') }}</span>
        <span :class="COMPONENTS.expenseLines.payer" data-testid="expense-payer">{{ expense.paidBy.name ?? '' }}</span>
        <VatAmount :gross="expense.amount" :class="COMPONENTS.expenseLines.amount" />
        <UButton v-if="editable" v-bind="BUTTONS.remove" aria-label="Slet" :disabled="pending" data-testid="expense-remove" @click="emit('remove', expense.id)" />
        <span v-else :class="COMPONENTS.expenseLines.removeSlot" />
      </div>
      <div :class="COMPONENTS.expenseLines.row" data-testid="expense-totals">
        <span />
        <span :class="COMPONENTS.expenseLines.total">Brugt</span>
        <VatAmount :gross="spent" :class="COMPONENTS.expenseLines.amount" data-testid="expense-spent" />
        <span :class="COMPONENTS.expenseLines.removeSlot" />
      </div>
    </div>
  </section>
</template>
