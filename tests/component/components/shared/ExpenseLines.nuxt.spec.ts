// @vitest-environment nuxt
import {describe, it, expect, beforeAll} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import {flushPromises} from '@vue/test-utils'
import {nextTick, ref} from 'vue'
import ExpenseLines from '~/components/shared/ExpenseLines.vue'
import {ExpenseFactory} from '~~/tests/e2e/testDataFactories/expenseFactory'
import {useOrder} from '~/composables/useOrder'
import {useTicket} from '~/composables/useTicket'
import {useBillingValidation} from '~/composables/useBillingValidation'
import {formatDate} from '~/utils/date'
import {findByTestId, findAllByTestId, clickByTestId} from '~~/tests/component/testHelpers'

/**
 * ExpenseLines: folded it is one row, the glyph, the title and the total in both units (or the empty text), with the
 * edit button for an editor. Open, it heads with the hint and Tilbage, shows Rådighedsbeløb, Brugt and Til rådighed
 * with the round as the live helping numbers, the entry form that turns the typed unit into gross øre, and the lines
 * with slet. The reporting user is the payer and the server writes the note.
 */
const {convertVat} = useOrder()
const {formatPrice} = useTicket()
const {VatModeSchema} = useBillingValidation()

let vatPercent: number
beforeAll(() => {
    vatPercent = useAppConfig().theslope?.kitchen?.vatPercent ?? 25
})
const grossOf = (exKr: number) => convertVat(exKr * 100, vatPercent, false)
const exOf = (grossOre: number) => convertVat(grossOre, vatPercent, true)

const lines = () => [
    ExpenseFactory.defaultExpense({id: 1, amount: grossOf(1012), paidBy: {id: 1, email: 'anna@example.com', name: 'Anna H.'}, createdAt: new Date('2026-04-12T10:00:00')}),
    ExpenseFactory.defaultExpense({id: 2, amount: grossOf(298), paidBy: {id: 2, email: 'bo@example.com', name: 'Bo K.'}, createdAt: new Date('2026-04-14T10:00:00')})
]
const spentOf = (expenses: ReturnType<typeof lines>) => expenses.reduce((sum, line) => sum + line.amount, 0)
const BUDGET = 178100

const mount = (props: Record<string, unknown> = {}) => mountSuspended(ExpenseLines, {
    props: {
        expenses: lines(), title: 'Madbestilling', hint: 'Hvad kostede indkøbene?', emptyText: 'Madbestilling mangler',
        editLabel: 'Rediger madbestilling', budgetGross: BUDGET, ...props
    },
    global: {provide: {isMd: ref(true)}}
})
type Wrapper = Awaited<ReturnType<typeof mount>>

const open = async (wrapper: Wrapper) => {
    await clickByTestId(wrapper, 'expense-edit')
    await nextTick()
}
const fillAmount = async (wrapper: Wrapper, value: string) => {
    await wrapper.find('input[name="expense-amount-input"]').setValue(value)
    await nextTick()
}
// The add button calls formRef.submit(); validation resolves asynchronously
const clickAdd = async (wrapper: Wrapper) => {
    await clickByTestId(wrapper, 'expense-add')
    await flushPromises()
    await nextTick()
}
const hintRow = (wrapper: Wrapper, label: string) => findAllByTestId(wrapper, 'expense-hint-row').find(row => row.text().startsWith(label))

describe('ExpenseLines', () => {
    describe('folded', () => {
        it('renders the title and the total in both units, no lines and no form', async () => {
            const wrapper = await mount()
            const spent = spentOf(lines())
            expect(findByTestId(wrapper, 'expense-row').text()).toContain('Madbestilling')
            expect(findByTestId(wrapper, 'expense-total').text()).toContain(formatPrice(exOf(spent)))
            expect(findByTestId(wrapper, 'expense-total').text()).toContain(`/ ${formatPrice(spent)} kr`)
            expect(findAllByTestId(wrapper, 'expense-line')).toHaveLength(0)
            expect(findByTestId(wrapper, 'expense-form').exists()).toBe(false)
            expect(findByTestId(wrapper, 'expense-hint').exists()).toBe(false)
        })

        it('GIVEN no lines WHEN rendering THEN the row carries the empty text instead of a total', async () => {
            const wrapper = await mount({expenses: []})
            expect(findByTestId(wrapper, 'expense-empty').text()).toBe('Madbestilling mangler')
            expect(findByTestId(wrapper, 'expense-total').exists()).toBe(false)
        })

        it('GIVEN a read-only pane WHEN rendering THEN there is no edit button', async () => {
            const wrapper = await mount()
            expect(findByTestId(wrapper, 'expense-edit').exists()).toBe(false)
        })

        it('GIVEN an editable pane WHEN rendering THEN the edit button carries its label', async () => {
            const wrapper = await mount({editable: true})
            expect(findByTestId(wrapper, 'expense-edit').text()).toContain('Rediger madbestilling')
        })
    })

    describe('open', () => {
        it('GIVEN the edit button WHEN clicked THEN the editor heads with the hint and Tilbage, and Tilbage folds it back', async () => {
            const wrapper = await mount({editable: true})
            await open(wrapper)
            expect(findByTestId(wrapper, 'expense-row').exists()).toBe(false)
            expect(wrapper.text()).toContain('Hvad kostede indkøbene?')
            expect(findByTestId(wrapper, 'expense-back').text()).toContain('Tilbage')

            await clickByTestId(wrapper, 'expense-back')
            await nextTick()
            expect(findByTestId(wrapper, 'expense-row').exists()).toBe(true)
            expect(findByTestId(wrapper, 'expense-form').exists()).toBe(false)
        })

        it('GIVEN a budget WHEN open THEN the hint reads Rådighedsbeløb, Brugt and Til rådighed as the difference with its icon', async () => {
            const wrapper = await mount({editable: true})
            await open(wrapper)
            const spent = spentOf(lines())
            expect(hintRow(wrapper, 'Rådighedsbeløb')!.text()).toContain(`/ ${formatPrice(BUDGET)} kr`)
            expect(hintRow(wrapper, 'Brugt')!.text()).toContain(`/ ${formatPrice(spent)} kr`)
            const left = hintRow(wrapper, 'Til rådighed')!
            expect(left.text()).toContain(`/ +${formatPrice(BUDGET - spent)} kr`)
            expect(left.find('[data-testid="vat-amount-ok"]').exists()).toBe(true)
            expect(findByTestId(wrapper, 'expense-spent').exists()).toBe(false)
        })

        it('GIVEN spending over the budget WHEN open THEN Til rådighed reads red with its minus and the overdraft icon', async () => {
            const wrapper = await mount({editable: true, budgetGross: 1000})
            await open(wrapper)
            const left = hintRow(wrapper, 'Til rådighed')!
            expect(left.text()).toContain(`/ -${formatPrice(spentOf(lines()) - 1000)} kr`)
            expect(left.find('[data-testid="vat-amount-over"]').exists()).toBe(true)
        })

        it('GIVEN the round WHEN open THEN it follows the three numbers with its label; without one no round row shows', async () => {
            const withRound = await mount({editable: true, leftRound: {label: 'Madhold 2, 12/04–14/04', gross: -23800}})
            await open(withRound)
            const round = hintRow(withRound, 'Madhold 2, 12/04–14/04')!
            expect(round.find('[data-testid="vat-amount-over"]').exists()).toBe(true)
            expect(findAllByTestId(withRound, 'expense-hint-row')).toHaveLength(4)

            const without = await mount({editable: true})
            await open(without)
            expect(findAllByTestId(without, 'expense-hint-row')).toHaveLength(3)
        })

        it('GIVEN no budget WHEN open THEN the hint carries Brugt alone', async () => {
            const wrapper = await mount({editable: true, budgetGross: null})
            await open(wrapper)
            expect(findAllByTestId(wrapper, 'expense-hint-row')).toHaveLength(1)
            expect(hintRow(wrapper, 'Brugt')).toBeDefined()
        })

        it('GIVEN lines WHEN open THEN every line shows its date, bestiller and both units in entry order, with slet', async () => {
            const wrapper = await mount({editable: true})
            await open(wrapper)
            const rows = findAllByTestId(wrapper, 'expense-line')
            expect(rows).toHaveLength(2)
            lines().forEach((line, index) => {
                expect(rows[index]!.text()).toContain(formatDate(line.createdAt, 'dd/MM'))
                expect(rows[index]!.text()).toContain(line.paidBy.name!)
                expect(rows[index]!.text()).toContain(formatPrice(exOf(line.amount)))
                expect(rows[index]!.text()).toContain(`/ ${formatPrice(line.amount)} kr`)
            })
            expect(findAllByTestId(wrapper, 'expense-remove')).toHaveLength(2)
        })

        it('GIVEN no lines WHEN open THEN no header row shows and the form is ready', async () => {
            const wrapper = await mount({editable: true, expenses: []})
            await open(wrapper)
            expect(wrapper.text()).not.toContain('Bestiller')
            expect(findByTestId(wrapper, 'expense-form').exists()).toBe(true)
        })
    })

    describe('editing', () => {
        it('GIVEN an ex moms amount WHEN adding THEN emits the gross øre line and clears the amount', async () => {
            const wrapper = await mount({editable: true})
            await open(wrapper)
            await fillAmount(wrapper, '1012')
            expect(findByTestId(wrapper, 'expense-alternative').text()).toBe(`= ${formatPrice(grossOf(1012))} kr inkl. moms`)

            await clickAdd(wrapper)

            expect(wrapper.emitted('add')).toEqual([[{amount: grossOf(1012)}]])
            expect((wrapper.find('input[name="expense-amount-input"]').element as HTMLInputElement).value).toBe('')
        })

        it('GIVEN an inkl. moms amount WHEN adding THEN the øre are the typed kr', async () => {
            const wrapper = await mount({editable: true})
            await open(wrapper)
            wrapper.findComponent({name: 'USelect'}).vm.$emit('update:modelValue', VatModeSchema.enum.inkl)
            await nextTick()
            await fillAmount(wrapper, '1265')
            expect(findByTestId(wrapper, 'expense-alternative').text()).toBe(`= ${formatPrice(exOf(126500))} kr ex moms`)

            await clickAdd(wrapper)

            expect(wrapper.emitted('add')).toEqual([[{amount: 126500}]])
        })

        it.each([
            {desc: 'an amount of zero', amount: '0'},
            {desc: 'no amount', amount: ''}
        ])('GIVEN $desc WHEN adding THEN nothing is emitted and the field says why', async ({amount}) => {
            const wrapper = await mount({editable: true})
            await open(wrapper)
            await fillAmount(wrapper, amount)

            await clickAdd(wrapper)

            expect(wrapper.emitted('add')).toBeFalsy()
            expect(wrapper.text()).toContain('Beløbet skal være større end nul')
        })

        it('GIVEN a line WHEN its remove button is clicked THEN emits remove with the id', async () => {
            const wrapper = await mount({editable: true})
            await open(wrapper)
            const removes = findAllByTestId(wrapper, 'expense-remove')
            await removes[1]!.trigger('click')
            expect(wrapper.emitted('remove')).toEqual([[2]])
        })

        it('GIVEN a pending request WHEN open THEN add and remove are disabled', async () => {
            const wrapper = await mount({editable: true})
            await open(wrapper)
            await wrapper.setProps({pending: true})
            await nextTick()
            expect(findByTestId(wrapper, 'expense-add').attributes('disabled')).toBeDefined()
            findAllByTestId(wrapper, 'expense-remove').forEach(button => expect(button.attributes('disabled')).toBeDefined())
        })
    })
})
