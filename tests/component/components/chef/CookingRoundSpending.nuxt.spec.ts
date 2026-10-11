// @vitest-environment nuxt
import {describe, it, expect} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import {ref} from 'vue'
import CookingRoundSpending from '~/components/chef/CookingRoundSpending.vue'
import type {CookingRoundRow} from '~/composables/useBookingUi'
import {useTicket} from '~/composables/useTicket'
import {formatDate} from '~/utils/date'
import {findByTestId, findAllByTestId} from '~~/tests/component/testHelpers'

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
    props: {label: 'Madhold 2, 12/04–14/04', rows, ...props},
    global: {provide: {isMd: ref(true)}}
})

describe('CookingRoundSpending', () => {
    it('renders the label, one row per dinner in order with date and menu, and marks the current one', async () => {
        const wrapper = await mount()
        expect(findByTestId(wrapper, 'cooking-round-label').text()).toBe('Madhold 2, 12/04–14/04')
        const rendered = findAllByTestId(wrapper, 'cooking-round-row')
        expect(rendered).toHaveLength(3)
        rows.forEach((row, index) => {
            expect(rendered[index]!.text()).toContain(formatDate(row.date, 'dd/MM'))
            expect(rendered[index]!.text()).toContain(row.menuTitle)
        })
        expect(rendered[2]!.text()).toContain('denne')
        expect(rendered[0]!.text()).not.toContain('denne')
    })

    it('reads each row\'s allowance, spending and what is left in both units, red with the exclamation icon when over', async () => {
        const wrapper = await mount()
        const over = findAllByTestId(wrapper, 'cooking-round-row')[0]!
        expect(over.text()).toContain(`/ ${formatPrice(178100)} kr`)
        expect(over.text()).toContain(`/ ${formatPrice(192500)} kr`)
        expect(over.text()).toContain(`/ -${formatPrice(14400)} kr`)
        expect(over.find('[data-testid="vat-amount-over"]').exists()).toBe(true)
        const under = findAllByTestId(wrapper, 'cooking-round-row')[1]!
        expect(under.find('[data-testid="vat-amount-ok"]').exists()).toBe(true)
    })

    it('sums the round into the team\'s total row', async () => {
        const wrapper = await mount()
        const total = findByTestId(wrapper, 'cooking-round-total')
        expect(total.text()).toContain('Madhold 2')
        expect(total.text()).toContain(`/ ${formatPrice(178100 + 189000 + 187300)} kr`)
        expect(total.text()).toContain(`/ ${formatPrice(192500 + 174400 + 163800)} kr`)
        expect(total.text()).toContain(`/ +${formatPrice(178100 + 189000 + 187300 - 192500 - 174400 - 163800)} kr`)
        expect(total.find('[data-testid="vat-amount-ok"]').exists()).toBe(true)
    })
})
