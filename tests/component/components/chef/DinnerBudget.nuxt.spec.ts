// @vitest-environment nuxt
import {describe, it, expect, beforeAll} from 'vitest'
import {mountSuspended, registerEndpoint} from '@nuxt/test-utils/runtime'
import {ref} from 'vue'
import DinnerBudget from '~/components/chef/DinnerBudget.vue'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {ExpenseFactory} from '~~/tests/e2e/testDataFactories/expenseFactory'
import {useOrder} from '~/composables/useOrder'
import {useTicket} from '~/composables/useTicket'
import {useBookingValidation, type OrderDetail, type OrderState, type TicketType} from '~/composables/useBookingValidation'
import {dinnerSpendingFragment, teamSpendingFragment, type CookingRoundRow} from '~/composables/useBookingUi'
import {findByTestId, findAllByTestId, clickByTestId} from '~~/tests/component/testHelpers'

/**
 * DinnerBudget: the three boxes in both units, the RÅDIGHEDSBELØB box with start, Brugt and Tilbage, and under the
 * one chevron the ticket table named by type, the summary, the ticket changes and the team's round.
 */
const {calculateBudget} = useOrder()
const {formatPrice, ticketTypeConfig} = useTicket()
const {TicketTypeSchema, OrderStateSchema} = useBookingValidation()

let baseRate: number
let vatPercent: number
beforeAll(() => {
    const kitchen = useAppConfig().theslope?.kitchen
    baseRate = kitchen?.baseRatePercent ?? 5
    vatPercent = kitchen?.vatPercent ?? 25
})

const ticket = (id: number, ticketType: TicketType, price: number, state: OrderState = OrderStateSchema.enum.BOOKED): OrderDetail =>
    ({...OrderFactory.defaultOrderDetail(), id, ticketType, priceAtBooking: price, state, ticketPrice: {...OrderFactory.defaultOrderDetail().ticketPrice!, ticketType, price}})

const orders = [
    ticket(1, TicketTypeSchema.enum.ADULT, 5000),
    ticket(2, TicketTypeSchema.enum.ADULT, 5000, OrderStateSchema.enum.RELEASED),
    ticket(3, TicketTypeSchema.enum.CHILD, 2500)
]
const expenses = [ExpenseFactory.defaultExpense({id: 1, amount: 4000})]
const round: CookingRoundRow[] = [
    {dinnerEventId: 7, date: new Date('2026-04-12T18:00:00'), menuTitle: 'Lasagne', isCurrent: true, budgetGross: 11875, spentGross: 4000},
    {dinnerEventId: 8, date: new Date('2026-04-13T18:00:00'), menuTitle: 'Risotto', isCurrent: false, budgetGross: 15000, spentGross: 0}
]

// The ticket changes pane reaches the bookings store; its datasets answer empty here
registerEndpoint('/api/chef/dinner/7/order-history', () => ({dinnerEventId: 7, since: null, changes: [], olderCount: 0}))
registerEndpoint('/api/admin/season/active', () => null)
registerEndpoint('/api/admin/season', () => [])
registerEndpoint('/api/admin/household', () => [])
registerEndpoint('/api/team/my', () => [])
registerEndpoint('/api/admin/users/by-role/ALLERGYMANAGER', () => [])
registerEndpoint('/api/admin/users', () => [])
registerEndpoint('/api/admin/billing/periods', () => [])
registerEndpoint('/api/admin/billing/current-period', () => [])
registerEndpoint('/api/order', () => [])

const mount = (props: Record<string, unknown> = {}) => mountSuspended(DinnerBudget, {
    props: {orders, mode: 'full', expenses, dinnerEventId: 7, bookingDeadline: new Date('2026-04-03T18:00:00'), dinnerFragment: dinnerSpendingFragment(round[0]!, expenses), teamFragment: teamSpendingFragment(round, {team: 'Hele Madhold 2', heading: 'Hele Madhold 2, for perioden 12/04–13/04'}), ...props},
    global: {provide: {isMd: ref(true)}}
})

describe('DinnerBudget', () => {
    it('GIVEN paid tickets, a released one included WHEN rendering THEN the boxes read revenue, allowance and contribution in both units', async () => {
        const wrapper = await mount()
        const budget = calculateBudget(orders, baseRate, vatPercent)
        expect(findByTestId(wrapper, 'budget-box-revenue').text()).toContain(`${formatPrice(budget.totalRevenue)} kr`)
        expect(findByTestId(wrapper, 'budget-box-revenue').text()).not.toContain('/')
        expect(findByTestId(wrapper, 'budget-box-available').text()).toContain(`/ ${formatPrice(budget.availableBudget)} kr`)
        expect(findByTestId(wrapper, 'budget-box-contribution').text()).toContain(`/ ${formatPrice(budget.kitchenContribution)} kr`)
        expect(budget.totalRevenue).toBe(12500)
    })

    it('GIVEN lines WHEN rendering THEN the allowance box carries Brugt and Tilbage with its icon', async () => {
        const wrapper = await mount()
        const budget = calculateBudget(orders, baseRate, vatPercent)
        expect(findByTestId(wrapper, 'budget-spent').text()).toContain(`/ ${formatPrice(4000)} kr`)
        expect(findByTestId(wrapper, 'budget-left').text()).toContain(`/ +${formatPrice(budget.availableBudget - 4000)} kr`)
        expect(findByTestId(wrapper, 'budget-left').find('[data-testid="vat-amount-ok"]').exists()).toBe(true)
    })

    it('GIVEN the box rows WHEN rendering THEN Brugt and Tilbage both carry the icon slot, so their kr line up', async () => {
        const wrapper = await mount()
        expect(findByTestId(wrapper, 'budget-spent').find('[data-testid="vat-amount-slot"]').exists()).toBe(true)
        expect(findByTestId(wrapper, 'budget-left').find('[data-testid="vat-amount-slot"]').exists()).toBe(true)
    })

    it('GIVEN the chevron closed WHEN rendering THEN no details show', async () => {
        const wrapper = await mount()
        expect(findByTestId(wrapper, 'budget-details').exists()).toBe(false)
    })

    it('GIVEN the chevron opened WHEN rendering THEN the ticket table names the types, the summary ends at Rådighedsbeløb, the spending table holds the dinner and the ticket changes come last', async () => {
        const wrapper = await mount()
        await wrapper.find('button[name="toggle-budget-details"]').trigger('click')
        await wrapper.vm.$nextTick()

        const rows = findByTestId(wrapper, 'budget-ticket-table').findAll('tbody tr').filter(tr => tr.attributes('data-testid') === undefined && !tr.text().includes('Køkkenbidrag'))
        expect(rows.map(row => row.find('td').text())).toEqual([ticketTypeConfig.ADULT.label, ticketTypeConfig.CHILD.label])
        expect(findByTestId(wrapper, 'budget-summary-left').exists()).toBe(false)
        expect(findByTestId(wrapper, 'budget-summary-available').exists()).toBe(true)
        expect(findAllByTestId(wrapper, 'cooking-round')).toHaveLength(2)
        // This dinner: its heading, its one receipt as a row, its figures in the total row; the arrow only in the team's
        const own = findAllByTestId(wrapper, 'cooking-round')[0]!
        expect(own.find('[data-testid="cooking-round-heading"]').text()).toBe('Lasagne, 12/04/2026')
        expect(own.text()).toContain(`/ ${formatPrice(4000)} kr`)
        expect(own.find('[data-testid="cooking-round-marker"]').exists()).toBe(false)
        expect(findAllByTestId(wrapper, 'cooking-round')[1]!.find('[data-testid="cooking-round-marker"]').exists()).toBe(true)
        expect(findByTestId(wrapper, 'ticket-changes').exists()).toBe(true)
        expect(findByTestId(wrapper, 'cooking-round').exists()).toBe(true)
        // The dinner's figures, then the team's, then the ticket changes last
        expect(wrapper.html().indexOf('data-testid="ticket-changes"')).toBeGreaterThan(wrapper.html().indexOf('data-testid="cooking-round"'))
        expect(findAllByTestId(wrapper, 'cooking-round-heading')[1]!.text()).toBe('Hele Madhold 2, for perioden 12/04–13/04')
    })

    it('GIVEN no tickets WHEN opened THEN there are no ticket changes to see', async () => {
        const wrapper = await mount({orders: []})
        await wrapper.find('button[name="toggle-budget-details"]').trigger('click')
        await wrapper.vm.$nextTick()
        expect(findByTestId(wrapper, 'ticket-changes').exists()).toBe(false)
    })

    it('GIVEN a lone dinner WHEN opened THEN only this dinner\'s fragment shows, headed by the dinner', async () => {
        const wrapper = await mount({dinnerFragment: dinnerSpendingFragment(round[0]!, expenses), teamFragment: null})
        await wrapper.find('button[name="toggle-budget-details"]').trigger('click')
        await wrapper.vm.$nextTick()
        expect(findAllByTestId(wrapper, 'cooking-round')).toHaveLength(1)
        expect(findByTestId(wrapper, 'cooking-round-heading').text()).toBe('Lasagne, 12/04/2026')
        expect(findByTestId(wrapper, 'cooking-round-total').text()).toContain('Lasagne')
    })

    it('GIVEN no round WHEN opened THEN the round section is absent', async () => {
        const wrapper = await mount({dinnerFragment: null, teamFragment: null})
        await clickByTestId(wrapper, 'budget-box-revenue').catch(() => undefined)
        await wrapper.find('button[name="toggle-budget-details"]').trigger('click')
        await wrapper.vm.$nextTick()
        expect(findByTestId(wrapper, 'cooking-round').exists()).toBe(false)
    })
})
