<script setup lang="ts">
/**
 * ExpenseLines - the grocery lines behind a cost, as a section row of the chef card.
 *
 * Folded, one row like the card's other sections:
 *   (cart) MADBESTILLING   1.310 / 1.638 kr                      [Rediger madbestilling]   <- or the empty text
 *
 * Open, the editor the button reveals:
 *   Hvad kostede indkøbene?                                                    [Tilbage]
 *   Rådighedsbeløb                                   1.425 / 1.781 kr
 *   Brugt                                            1.310 / 1.638 kr
 *   Til rådighed                                      +115 /  +143 kr (check)
 *   Madhold 2, 12/04–14/04                            +190 /  +238 kr (check)
 *   [ beløb      ] [ Ex moms v ] [Tilføj]
 *   Dato   Bestiller                                   ex / inkl. moms
 *   12/04  Anna H.                                   1.012 / 1.265 kr   [slet]
 *
 * A line saves as it is added and goes as it is removed; Tilbage folds the row. The helping numbers follow the lines.
 * The reporting user is the payer and the server writes the note, so the form carries the amount alone. The same
 * section serves the kitchen's own purchases with its own title, hint and texts.
 */
import type {Expense, ExpenseCreate, ExpenseLineForm, VatMode} from '~/composables/useBillingValidation'
import type {NuxtUIColor} from '~/composables/useTheSlopeDesignSystem'
import type {Form, FormSubmitEvent} from '@nuxt/ui'

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
  leftRound?: {label: string, gross: number} | null
}>(), {
  glyph: undefined,
  color: undefined,
  editable: false,
  pending: false,
  budgetGross: null,
  leftRound: null
})

const emit = defineEmits<{
  add: [line: ExpenseCreate]
  remove: [expenseId: number]
}>()

const {COMPONENTS, BUTTONS, ICONS, COLOR, LAYOUTS, SIZES} = useTheSlopeDesignSystem()
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

const glyphName = computed(() => props.glyph ?? ICONS.shoppingCart)
const buttonColor = computed(() => props.color ?? COLOR.primary)
const isOpen = ref(false)

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
const left = computed(() => props.budgetGross === null ? null : props.budgetGross - spent.value)
</script>

<template>
  <section data-testid="expense-lines">
    <div v-if="!isOpen" :class="COMPONENTS.cardSection.row" data-testid="expense-row">
      <span :class="COMPONENTS.cardSection.label">
        <UIcon :name="glyphName" :class="COMPONENTS.cardSection.glyph" />
        {{ title }}
      </span>
      <div :class="COMPONENTS.cardSection.line">
        <VatAmount v-if="expenses.length" :gross="spent" data-testid="expense-total" />
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
        @click="isOpen = true"
      >
        {{ editLabel }}
      </UButton>
    </div>

    <div v-else :class="COMPONENTS.cardSection.editor" data-testid="expense-editor">
      <div :class="COMPONENTS.cardSection.editorHead">
        <h4 :class="COMPONENTS.cardSection.editorTitle">{{ hint }}</h4>
        <div :class="LAYOUTS.formButtonRow">
          <UButton v-bind="BUTTONS.back" data-testid="expense-back" @click="isOpen = false">Tilbage</UButton>
        </div>
      </div>

      <div :class="COMPONENTS.expenseLines.hint" data-testid="expense-hint">
        <div v-if="budgetGross !== null" :class="COMPONENTS.expenseLines.row" data-testid="expense-hint-row">
          <span :class="COMPONENTS.expenseLines.hintLabel">Rådighedsbeløb</span>
          <VatAmount :gross="budgetGross" :class="COMPONENTS.expenseLines.amount" />
          <span :class="COMPONENTS.expenseLines.removeSlot" />
        </div>
        <div :class="COMPONENTS.expenseLines.row" data-testid="expense-hint-row">
          <span :class="COMPONENTS.expenseLines.hintLabel">Brugt</span>
          <VatAmount :gross="spent" :class="COMPONENTS.expenseLines.amount" />
          <span :class="COMPONENTS.expenseLines.removeSlot" />
        </div>
        <div v-if="left !== null" :class="COMPONENTS.expenseLines.row" data-testid="expense-hint-row">
          <span :class="COMPONENTS.expenseLines.hintLabel">Til rådighed</span>
          <VatAmount :gross="left" balance :class="COMPONENTS.expenseLines.amount" />
          <span :class="COMPONENTS.expenseLines.removeSlot" />
        </div>
        <div v-if="leftRound" :class="COMPONENTS.expenseLines.row" data-testid="expense-hint-row">
          <span :class="COMPONENTS.expenseLines.hintLabel">{{ leftRound.label }}</span>
          <VatAmount :gross="leftRound.gross" balance :class="COMPONENTS.expenseLines.amount" />
          <span :class="COMPONENTS.expenseLines.removeSlot" />
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
          <UButton v-bind="BUTTONS.save" :size="SIZES.small" :loading="pending" :disabled="pending" data-testid="expense-add" @click="formRef?.submit()">
            Tilføj
          </UButton>
        </div>
        <div v-if="alternative" :class="COMPONENTS.expenseLines.alternative" data-testid="expense-alternative">{{ alternative }}</div>
      </UForm>

      <div v-if="expenses.length" :class="COMPONENTS.expenseLines.list">
        <div :class="COMPONENTS.expenseLines.row">
          <span :class="COMPONENTS.expenseLines.head">Dato</span>
          <span :class="COMPONENTS.expenseLines.head">Bestiller</span>
          <span :class="COMPONENTS.expenseLines.headRight">ex / inkl. moms</span>
          <span :class="COMPONENTS.expenseLines.removeSlot" />
        </div>
        <div v-for="expense in expenses" :key="expense.id" :class="COMPONENTS.expenseLines.row" data-testid="expense-line">
          <span :class="COMPONENTS.expenseLines.date">{{ formatDate(expense.createdAt, 'dd/MM') }}</span>
          <span :class="COMPONENTS.expenseLines.payer" data-testid="expense-payer">{{ expense.paidBy.name ?? '' }}</span>
          <VatAmount :gross="expense.amount" :class="COMPONENTS.expenseLines.amount" />
          <UButton v-bind="BUTTONS.remove" aria-label="Slet" :disabled="pending" data-testid="expense-remove" @click="emit('remove', expense.id)" />
        </div>
      </div>
    </div>
  </section>
</template>
