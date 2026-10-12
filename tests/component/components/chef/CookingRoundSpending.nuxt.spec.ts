// @vitest-environment nuxt
import {describe, it, expect} from 'vitest'
import CookingRoundSpending from '~/components/chef/CookingRoundSpending.vue'
import {dinnerSpendingFragment, teamSpendingFragment, type CookingRoundRow, type SpendingFragment} from '~/composables/useBookingUi'
import {ExpenseFactory} from '~~/tests/e2e/testDataFactories/expenseFactory'
import {useTicket} from '~/composables/useTicket'
import {formatDate} from '~/utils/date'
import {mountWithTooltipProvider, findByTestId} from '~~/tests/component/testHelpers'

/**
 * CookingRoundSpending: a fragment of the one spending table. The team's round: heading, one row per cooking day with
 * the arrow on the dinner on view, the team's total row. This dinner: its heading, its receipts as rows, its figures
 * in the total row, the table's empty state without receipts.
 */
const {formatPrice} = useTicket()

const rows: CookingRoundRow[] = [
    {dinnerEventId: 1, date: new Date('2026-04-12T18:00:00'), menuTitle: 'Lasagne', isCurrent: false, budgetGross: 178100, spentGross: 192500},
    {dinnerEventId: 2, date: new Date('2026-04-13T18:00:00'), menuTitle: 'Boller i karry', isCurrent: false, budgetGross: 189000, spentGross: 174400},
    {dinnerEventId: 3, date: new Date('2026-04-14T18:00:00'), menuTitle: 'Risotto', isCurrent: true, budgetGross: 187300, spentGross: 163800}
]
const words = {team: 'Hele Madhold 2', heading: 'Hele Madhold 2, for perioden 12/04–14/04'}

const mount = (props: {fragment: SpendingFragment}) => mountWithTooltipProvider(CookingRoundSpending, {props, isMd: true})
// The table's body rows without the total row the body-bottom slot adds
const dataRows = (wrapper: Awaited<ReturnType<typeof mount>>) => wrapper.findAll('tbody tr').filter(tr => tr.attributes('data-testid') !== 'cooking-round-total')

describe('CookingRoundSpending, the team\'s round', () => {
    it('renders the heading, one row per dinner in order with date and menu, and the arrow on the dinner on view', async () => {
        const wrapper = await mount({fragment: teamSpendingFragment(rows, words)})
        expect(findByTestId(wrapper, 'cooking-round-heading').text()).toBe(words.heading)
        const rendered = dataRows(wrapper)
        expect(rendered).toHaveLength(3)
        rows.forEach((row, index) => {
            expect(rendered[index]!.text()).toContain(formatDate(row.date))
            expect(rendered[index]!.text()).toContain(row.menuTitle)
        })
        expect(rendered[2]!.find('[data-testid="cooking-round-marker"]').exists()).toBe(true)
        expect(rendered[0]!.find('[data-testid="cooking-round-marker"]').exists()).toBe(false)
    })

    it('reads each row\'s allowance, spending and what is left in both units, red with the exclamation icon when over', async () => {
        const wrapper = await mount({fragment: teamSpendingFragment(rows, words)})
        const over = dataRows(wrapper)[0]!
        expect(over.text()).toContain(`/ ${formatPrice(178100)} kr`)
        expect(over.text()).toContain(`/ ${formatPrice(192500)} kr`)
        expect(over.text()).toContain(`/ -${formatPrice(14400)} kr`)
        expect(over.find('[data-testid="vat-amount-over"]').exists()).toBe(true)
        expect(dataRows(wrapper)[1]!.find('[data-testid="vat-amount-ok"]').exists()).toBe(true)
    })

    it('GIVEN a dinner without tickets yet WHEN rendering THEN its Tilbage carries the waiting glyph, not the check', async () => {
        const empty: CookingRoundRow = {dinnerEventId: 4, date: new Date('2026-04-15T18:00:00'), menuTitle: 'Pasta', isCurrent: false, budgetGross: 0, spentGross: 0}
        const wrapper = await mount({fragment: teamSpendingFragment([...rows, empty], words)})
        const last = dataRows(wrapper)[3]!
        expect(last.find('[data-testid="vat-amount-pending"]').exists()).toBe(true)
        expect(last.find('[data-testid="vat-amount-ok"]').exists()).toBe(false)
    })

    it('sums the round into the team\'s total row', async () => {
        const wrapper = await mount({fragment: teamSpendingFragment(rows, words)})
        const total = findByTestId(wrapper, 'cooking-round-total')
        expect(total.text()).toContain('Hele Madhold 2')
        expect(total.text()).toContain(`/ ${formatPrice(178100 + 189000 + 187300)} kr`)
        expect(total.text()).toContain(`/ ${formatPrice(192500 + 174400 + 163800)} kr`)
        expect(total.text()).toContain(`/ +${formatPrice(178100 + 189000 + 187300 - 192500 - 174400 - 163800)} kr`)
        expect(total.find('[data-testid="vat-amount-ok"]').exists()).toBe(true)
    })
})

describe('CookingRoundSpending, this dinner', () => {
    const NOTE = '"Risotto" 14/04/2026, Anna H. bestiller for Madhold 2'
    const receipt = ExpenseFactory.defaultExpense({id: 7, amount: 126500, description: NOTE, createdAt: new Date('2026-04-12T10:00:00')})

    it('heads with the menu title and date, lists the receipts with their note and amount, and carries the figures in the total row', async () => {
        const wrapper = await mount({fragment: dinnerSpendingFragment(rows[2]!, [receipt])})
        expect(findByTestId(wrapper, 'cooking-round-heading').text()).toBe('Risotto, 14/04/2026')
        const rendered = dataRows(wrapper)
        expect(rendered).toHaveLength(1)
        expect(rendered[0]!.text()).toContain('12/04/2026')
        expect(rendered[0]!.text()).toContain(NOTE)
        expect(rendered[0]!.text()).toContain(`/ ${formatPrice(126500)} kr`)
        expect(rendered[0]!.find('[data-testid="cooking-round-marker"]').exists()).toBe(false)
        const total = findByTestId(wrapper, 'cooking-round-total')
        expect(total.text()).toContain('Risotto')
        expect(total.text()).toContain(`/ ${formatPrice(187300)} kr`)
        expect(total.text()).toContain(`/ +${formatPrice(187300 - 163800)} kr`)
    })

    it('GIVEN no receipts WHEN rendering THEN the table\'s empty state is a noReceipts message', async () => {
        const wrapper = await mount({fragment: dinnerSpendingFragment(rows[2]!, [])})
        expect(dataRows(wrapper)).toHaveLength(1)
        expect(findByTestId(wrapper, 'cooking-round-empty').text()).toContain(useTheSlopeDesignSystem().getRandomEmptyMessage('noReceipts').text)
    })
})
