// @vitest-environment nuxt
import {describe, it, expect} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import {ref} from 'vue'
import CookingRoundSpending from '~/components/chef/CookingRoundSpending.vue'
import type {CookingRoundRow} from '~/composables/useBookingUi'
import {ExpenseFactory} from '~~/tests/e2e/testDataFactories/expenseFactory'
import {useTicket} from '~/composables/useTicket'
import {formatDate} from '~/utils/date'
import {findByTestId} from '~~/tests/component/testHelpers'

/**
 * CookingRoundSpending: one row per dinner of the round with allowance, spending and what is left, the current dinner
 * marked, the team's total row.
 */
const {formatPrice} = useTicket()

const rows: CookingRoundRow[] = [
    {dinnerEventId: 1, date: new Date('2026-04-12T18:00:00'), menuTitle: 'Lasagne', isCurrent: false, budgetGross: 178100, spentGross: 192500},
    {dinnerEventId: 2, date: new Date('2026-04-13T18:00:00'), menuTitle: 'Boller i karry', isCurrent: false, budgetGross: 189000, spentGross: 174400},
    {dinnerEventId: 3, date: new Date('2026-04-14T18:00:00'), menuTitle: 'Risotto', isCurrent: true, budgetGross: 187300, spentGross: 163800}
]

const mount = (props: Record<string, unknown> = {}) => mountSuspended(CookingRoundSpending, {
    props: {words: {team: 'Hele Madhold 2', heading: 'Hele Madhold 2, for perioden 12/04–14/04'}, rows, ...props},
    global: {provide: {isMd: ref(true)}}
})

// The table's body rows without the total row the body-bottom slot adds
const dataRows = (wrapper: Awaited<ReturnType<typeof mount>>) => wrapper.findAll('tbody tr').filter(tr => tr.attributes('data-testid') !== 'cooking-round-total')

describe('CookingRoundSpending', () => {
    it('renders the label, one row per dinner in order with date and menu, and marks the current one', async () => {
        const wrapper = await mount()
        expect(findByTestId(wrapper, 'cooking-round-heading').text()).toBe('Hele Madhold 2, for perioden 12/04–14/04')
        const rendered = dataRows(wrapper)
        expect(rendered).toHaveLength(3)
        rows.forEach((row, index) => {
            expect(rendered[index]!.text()).toContain(formatDate(row.date, 'dd/MM'))
            expect(rendered[index]!.text()).toContain(row.menuTitle)
        })
        // The arrow marks the dinner on view alone
        expect(rendered[2]!.find('[data-testid="cooking-round-marker"]').exists()).toBe(true)
        expect(rendered[0]!.find('[data-testid="cooking-round-marker"]').exists()).toBe(false)
    })

    it('reads each row\'s allowance, spending and what is left in both units, red with the exclamation icon when over', async () => {
        const wrapper = await mount()
        const over = dataRows(wrapper)[0]!
        expect(over.text()).toContain(`/ ${formatPrice(178100)} kr`)
        expect(over.text()).toContain(`/ ${formatPrice(192500)} kr`)
        expect(over.text()).toContain(`/ -${formatPrice(14400)} kr`)
        expect(over.find('[data-testid="vat-amount-over"]').exists()).toBe(true)
        const under = dataRows(wrapper)[1]!
        expect(under.find('[data-testid="vat-amount-ok"]').exists()).toBe(true)
    })

    it('GIVEN a lone dinner WHEN rendering THEN its one row shows without heading or total row', async () => {
        const wrapper = await mount({words: null, rows: [rows[2]]})
        expect(findByTestId(wrapper, 'cooking-round-heading').exists()).toBe(false)
        expect(findByTestId(wrapper, 'cooking-round-total').exists()).toBe(false)
        const rendered = dataRows(wrapper)
        expect(rendered).toHaveLength(1)
        expect(rendered[0]!.find('[data-testid="cooking-round-marker"]').exists()).toBe(true)
    })

    it('GIVEN receipts WHEN rendering this dinner THEN they follow its row as sub-rows with the bestiller and the amount', async () => {
        const receipt = ExpenseFactory.defaultExpense({id: 7, amount: 126500, paidBy: {id: 1, email: 'anna@example.com', name: 'Anna H.'}, createdAt: new Date('2026-04-12T10:00:00')})
        const wrapper = await mount({words: null, rows: [rows[2]], receipts: [receipt]})
        const rendered = dataRows(wrapper)
        expect(rendered).toHaveLength(2)
        expect(rendered[1]!.text()).toContain('Anna H.')
        expect(rendered[1]!.text()).toContain(`/ ${formatPrice(126500)} kr`)
        expect(rendered[1]!.text()).toContain('12/04')
    })

    it('GIVEN no receipts WHEN rendering this dinner THEN one sub-row says Madbestilling mangler', async () => {
        const wrapper = await mount({words: null, rows: [rows[2]], receipts: []})
        expect(dataRows(wrapper)[1]!.text()).toContain('Madbestilling mangler')
    })

    it('GIVEN a dinner without tickets yet WHEN rendering THEN its Tilbage carries the waiting glyph, not the check', async () => {
        const empty: CookingRoundRow = {dinnerEventId: 4, date: new Date('2026-04-15T18:00:00'), menuTitle: 'Pasta', isCurrent: false, budgetGross: 0, spentGross: 0}
        const wrapper = await mount({rows: [...rows, empty]})
        const last = dataRows(wrapper)[3]!
        expect(last.find('[data-testid="vat-amount-pending"]').exists()).toBe(true)
        expect(last.find('[data-testid="vat-amount-ok"]').exists()).toBe(false)
    })

    it('sums the round into the team\'s total row', async () => {
        const wrapper = await mount()
        const total = findByTestId(wrapper, 'cooking-round-total')
        expect(total.text()).toContain('Hele Madhold 2')
        expect(total.text()).toContain(`/ ${formatPrice(178100 + 189000 + 187300)} kr`)
        expect(total.text()).toContain(`/ ${formatPrice(192500 + 174400 + 163800)} kr`)
        expect(total.text()).toContain(`/ +${formatPrice(178100 + 189000 + 187300 - 192500 - 174400 - 163800)} kr`)
        expect(total.find('[data-testid="vat-amount-ok"]').exists()).toBe(true)
    })
})
