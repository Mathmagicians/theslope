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
 * ExpenseLines: lines with their bestiller and both units, the Brugt row, the helping numbers, and an entry form that
 * turns the typed unit into gross øre. The reporting user is the payer and the server writes the note.
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

const mount = (props: Record<string, unknown> = {}) => mountSuspended(ExpenseLines, {
    props: {expenses: lines(), title: 'Indkøbsomkostninger', hint: 'Hvad kostede indkøbene?', ...props},
    global: {provide: {isMd: ref(true)}}
})
type Wrapper = Awaited<ReturnType<typeof mount>>

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

describe('ExpenseLines', () => {
    describe('reading', () => {
        it('renders the title and hint, then every line with its date, bestiller and both units in entry order', async () => {
            const wrapper = await mount()
            expect(wrapper.text()).toContain('Indkøbsomkostninger')
            expect(wrapper.text()).toContain('Hvad kostede indkøbene?')
            const rows = findAllByTestId(wrapper, 'expense-line')
            expect(rows).toHaveLength(2)
            lines().forEach((line, index) => {
                expect(rows[index]!.text()).toContain(formatDate(line.createdAt, 'dd/MM'))
                expect(rows[index]!.text()).toContain(line.paidBy.name!)
                expect(rows[index]!.text()).toContain(formatPrice(exOf(line.amount)))
                expect(rows[index]!.text()).toContain(`/ ${formatPrice(line.amount)} kr`)
            })
        })

        it('sums the lines as Brugt in both units', async () => {
            const wrapper = await mount()
            const spent = spentOf(lines())
            expect(findByTestId(wrapper, 'expense-spent').text()).toContain(formatPrice(exOf(spent)))
            expect(findByTestId(wrapper, 'expense-spent').text()).toContain(`/ ${formatPrice(spent)} kr`)
        })

        it('GIVEN the helping numbers WHEN rendering THEN this dinner and the round read as balances with their icons', async () => {
            const wrapper = await mount({leftThisDinner: 14300, leftRound: {label: 'Madhold 2, 12/04–14/04', gross: -23800}})
            const dinner = findByTestId(wrapper, 'expense-left-dinner')
            expect(dinner.text()).toContain('Til rådighed denne middag')
            expect(dinner.text()).toContain(`+${formatPrice(exOf(14300))}`)
            expect(dinner.find('[data-testid="vat-amount-ok"]').exists()).toBe(true)
            const round = findByTestId(wrapper, 'expense-left-round')
            expect(round.text()).toContain('Madhold 2, 12/04–14/04')
            expect(round.find('[data-testid="vat-amount-over"]').exists()).toBe(true)
        })

        it('GIVEN no helping numbers WHEN rendering THEN the helper line is absent', async () => {
            const wrapper = await mount()
            expect(findByTestId(wrapper, 'expense-left-dinner').exists()).toBe(false)
            expect(findByTestId(wrapper, 'expense-left-round').exists()).toBe(false)
        })

        it('GIVEN no lines WHEN rendering THEN Brugt reads zero and no header row shows', async () => {
            const wrapper = await mount({expenses: []})
            expect(findAllByTestId(wrapper, 'expense-line')).toHaveLength(0)
            expect(wrapper.text()).not.toContain('Bestiller')
            expect(findByTestId(wrapper, 'expense-spent').text()).toContain(`/ ${formatPrice(0)} kr`)
        })

        it('GIVEN a read-only pane WHEN rendering THEN neither the form nor the remove buttons exist', async () => {
            const wrapper = await mount()
            expect(findByTestId(wrapper, 'expense-form').exists()).toBe(false)
            expect(findAllByTestId(wrapper, 'expense-remove')).toHaveLength(0)
        })
    })

    describe('editing', () => {
        it('GIVEN an ex moms amount WHEN adding THEN emits the gross øre line and clears the amount', async () => {
            const wrapper = await mount({editable: true})
            await fillAmount(wrapper, '1012')
            expect(findByTestId(wrapper, 'expense-alternative').text()).toBe(`= ${formatPrice(grossOf(1012))} kr inkl. moms`)

            await clickAdd(wrapper)

            expect(wrapper.emitted('add')).toEqual([[{amount: grossOf(1012)}]])
            expect((wrapper.find('input[name="expense-amount-input"]').element as HTMLInputElement).value).toBe('')
        })

        it('GIVEN an inkl. moms amount WHEN adding THEN the øre are the typed kr', async () => {
            const wrapper = await mount({editable: true})
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
            await fillAmount(wrapper, amount)

            await clickAdd(wrapper)

            expect(wrapper.emitted('add')).toBeFalsy()
            expect(wrapper.text()).toContain('Beløbet skal være større end nul')
        })

        it('GIVEN a line WHEN its remove button is clicked THEN emits remove with the id', async () => {
            const wrapper = await mount({editable: true})
            const removes = findAllByTestId(wrapper, 'expense-remove')
            expect(removes).toHaveLength(2)
            await removes[1]!.trigger('click')
            expect(wrapper.emitted('remove')).toEqual([[2]])
        })

        it('GIVEN a pending request WHEN rendering THEN add and remove are disabled', async () => {
            const wrapper = await mount({editable: true, pending: true})
            expect(findByTestId(wrapper, 'expense-add').attributes('disabled')).toBeDefined()
            findAllByTestId(wrapper, 'expense-remove').forEach(button => expect(button.attributes('disabled')).toBeDefined())
        })
    })
})
