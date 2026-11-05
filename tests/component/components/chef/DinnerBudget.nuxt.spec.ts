// @vitest-environment nuxt
import {describe, it, expect, beforeAll, beforeEach, afterEach} from 'vitest'
import {registerEndpoint} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount} from '@vue/test-utils'
import DinnerBudget from '~/components/chef/DinnerBudget.vue'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {ExpenseFactory} from '~~/tests/e2e/testDataFactories/expenseFactory'
import {useOrder} from '~/composables/useOrder'
import {useTicket, ticketTypeLabel} from '~/composables/useTicket'
import {useBookingValidation, type OrderDetail, type OrderState, type TicketType} from '~/composables/useBookingValidation'
import {cookingRoundWords, dinnerSpendingFragment, teamSpendingFragment, type CookingRoundRow} from '~/composables/useBookingUi'
import {mountWithTooltipProvider, findByTestId, findAllByTestId, clickByTestId, registerEmptyStoreEndpoints, kitchenConfig, resetStores, tableHeaders, cellsByHeader, rowAt} from '~~/tests/component/testHelpers'
import {formatDate, DATE_SETTINGS} from '~/utils/date'
import {formatPortions} from '~/utils/utils'
import {BOOKING_WORDS} from '~/config/bookingWords'

/**
 * DinnerBudget: the three boxes in both units, the RÅDIGHEDSBELØB box with start, Brugt and Tilbage, and under the
 * one chevron the ticket table named by type, the summary, the ticket changes and the team's round.
 */
const {calculateBudget, calculateTotalPortions} = useOrder()
const {formatPrice} = useTicket()
const {TicketTypeSchema, OrderStateSchema} = useBookingValidation()

let baseRate: number
let vatPercent: number
beforeAll(() => {
    ({baseRatePercent: baseRate, vatPercent} = kitchenConfig())
})

const ticket = (id: number, ticketType: TicketType, price: number, state: OrderState = OrderStateSchema.enum.BOOKED): OrderDetail =>
    ({...OrderFactory.defaultOrderDetail(), id, ticketType, priceAtBooking: price, state, ticketPrice: {...OrderFactory.ticketPriceRow(ticketType), price}})

const orders = [
    ticket(1, TicketTypeSchema.enum.ADULT, 5000),
    ticket(2, TicketTypeSchema.enum.ADULT, 5000, OrderStateSchema.enum.RELEASED),
    ticket(3, TicketTypeSchema.enum.CHILD, 2500)
]
const expenses = [ExpenseFactory.defaultExpense({id: 1, amount: 4000})]
// The team's round, Lasagne the dinner on view
const LASAGNE: CookingRoundRow = {dinnerEventId: 7, date: new Date('2026-04-12T18:00:00'), menuTitle: 'Lasagne', isCurrent: true, budgetGross: 11875, spentGross: 4000}
const RISOTTO: CookingRoundRow = {dinnerEventId: 8, date: new Date('2026-04-13T18:00:00'), menuTitle: 'Risotto', isCurrent: false, budgetGross: 15000, spentGross: 0}
const round = [LASAGNE, RISOTTO]
const ownHeading = `Lasagne, ${formatDate(LASAGNE.date, DATE_SETTINGS.DAY_MONTH_MASK)}`
const roundWords = cookingRoundWords('Madhold 2', 2, LASAGNE.date, RISOTTO.date)

// The ticket changes pane reaches the bookings store; its datasets answer empty here
registerEmptyStoreEndpoints()
registerEndpoint('/api/chef/dinner/7/order-history', () => ({dinnerEventId: 7, since: null, changes: [], olderCount: 0}))

enableAutoUnmount(afterEach)

beforeEach(() => {
    resetStores()
})

const mount = (props: Record<string, unknown> = {}) => mountWithTooltipProvider(DinnerBudget, {
    props: {orders, mode: 'full', expenses, dinnerEventId: 7, bookingDeadline: new Date('2026-04-03T18:00:00'), dinnerFragment: dinnerSpendingFragment(LASAGNE, expenses), teamFragment: teamSpendingFragment(round, roundWords), ...props},
    isMd: true
})

describe('DinnerBudget', () => {
    it('GIVEN paid tickets, a released one included, and lines WHEN rendering with the chevron closed THEN the boxes read revenue, allowance and contribution in both units, the allowance box carries Brugt and Tilbage, and no details show', async () => {
        const wrapper = await mount()
        const budget = calculateBudget(orders, baseRate, vatPercent)
        expect(findByTestId(wrapper, 'budget-box-revenue').text()).toContain(`${formatPrice(budget.totalRevenue)} kr`)
        expect(findByTestId(wrapper, 'budget-box-revenue').text()).not.toContain('/')
        expect(findByTestId(wrapper, 'budget-box-available').text()).toContain(`/ ${formatPrice(budget.availableBudget)} kr`)
        expect(findByTestId(wrapper, 'budget-box-contribution').text()).toContain(`/ ${formatPrice(budget.kitchenContribution)} kr`)
        // Both split boxes name the units under their amount
        expect(findByTestId(wrapper, 'budget-box-available').text()).toContain(BOOKING_WORDS.vatUnits)
        expect(findByTestId(wrapper, 'budget-box-contribution').text()).toContain(BOOKING_WORDS.vatUnits)
        expect(budget.totalRevenue).toBe(12500)
        // The pane's title and chevron, each box's label, the kuverter and the contribution's rate
        expect(wrapper.find('h4').text()).toBe(BOOKING_WORDS.budget.title)
        expect(wrapper.find('button[name="toggle-budget-details"]').attributes('aria-label')).toBe(BOOKING_WORDS.budget.toggle(false))
        expect(findByTestId(wrapper, 'budget-box-revenue').text()).toContain(BOOKING_WORDS.budget.boxes.revenue)
        expect(findByTestId(wrapper, 'budget-box-revenue').text()).toContain(BOOKING_WORDS.budget.portions(formatPortions(calculateTotalPortions(orders))))
        expect(findByTestId(wrapper, 'budget-box-available').text()).toContain(BOOKING_WORDS.budget.boxes.allowance)
        expect(findByTestId(wrapper, 'budget-box-contribution').text()).toContain(BOOKING_WORDS.budget.boxes.contribution)
        expect(findByTestId(wrapper, 'budget-box-contribution').text()).toContain(BOOKING_WORDS.budget.contributionRate(baseRate))

        // Brugt and Tilbage with its icon; both carry the icon slot, so their kr line up
        expect(findByTestId(wrapper, 'budget-spent').text()).toContain(`/ ${formatPrice(4000)} kr`)
        expect(findByTestId(wrapper, 'budget-left').text()).toContain(`/ +${formatPrice(budget.availableBudget - 4000)} kr`)
        expect(findByTestId(findByTestId(wrapper, 'budget-left'), 'vat-amount-ok').exists()).toBe(true)
        expect(findByTestId(findByTestId(wrapper, 'budget-spent'), 'vat-amount-slot').exists()).toBe(true)
        expect(findByTestId(findByTestId(wrapper, 'budget-left'), 'vat-amount-slot').exists()).toBe(true)

        expect(findByTestId(wrapper, 'budget-details').exists()).toBe(false)
    })

    it('GIVEN the chevron opened WHEN rendering THEN the ticket table names the types, the summary ends at Rådighedsbeløb, the spending table holds the dinner and the ticket changes come last', async () => {
        const wrapper = await mount()
        await wrapper.find('button[name="toggle-budget-details"]').trigger('click')
        await wrapper.vm.$nextTick()

        expect(wrapper.find('button[name="toggle-budget-details"]').attributes('aria-label')).toBe(BOOKING_WORDS.budget.toggle(true))
        // The ticket table: its headers, a row per type, then its sums: Indtægter, Køkkenbidrag at its rate, Rådighedsbeløb
        const ticketTable = findByTestId(wrapper, 'budget-ticket-table')
        expect(tableHeaders(ticketTable)).toEqual(Object.values(BOOKING_WORDS.budget.ticketColumns))
        expect([0, 1].map(index => cellsByHeader(ticketTable, index)[BOOKING_WORDS.budget.ticketColumns.ticketType])).toEqual([ticketTypeLabel(TicketTypeSchema.enum.ADULT), ticketTypeLabel(TicketTypeSchema.enum.CHILD)])
        expect(rowAt(ticketTable, 2).attributes('data-testid')).toBe('budget-summary-revenue')
        expect(rowAt(ticketTable, 2).text()).toContain(BOOKING_WORDS.budget.revenue)
        expect(rowAt(ticketTable, 3).text()).toContain(BOOKING_WORDS.budget.contribution(baseRate))
        expect(findByTestId(wrapper, 'budget-summary-left').exists()).toBe(false)
        expect(findByTestId(wrapper, 'budget-summary-available').exists()).toBe(true)
        // This dinner: its heading, its one receipt as a row, its figures in the total row; the team's round: its badge,
        // its period and the arrow, which only the team's carries
        const sections = findAllByTestId(wrapper, 'cooking-round').map(section => ({
            heading: findByTestId(section, 'cooking-round-heading').text(),
            text: section.text(),
            marked: findByTestId(section, 'cooking-round-marker').exists()
        }))
        expect(sections).toEqual([
            {heading: ownHeading, text: expect.stringContaining(`/ ${formatPrice(4000)} kr`), marked: false},
            {heading: expect.stringContaining(roundWords.period), text: expect.any(String), marked: true}
        ])
        expect(findByTestId(wrapper, 'ticket-changes').exists()).toBe(true)
        // The dinner's figures, then the team's, then the ticket changes last
        expect(wrapper.html().indexOf('data-testid="ticket-changes"')).toBeGreaterThan(wrapper.html().indexOf('data-testid="cooking-round"'))
    })

    it('GIVEN no tickets WHEN opened THEN there are no ticket changes to see', async () => {
        const wrapper = await mount({orders: []})
        await wrapper.find('button[name="toggle-budget-details"]').trigger('click')
        await wrapper.vm.$nextTick()
        expect(findByTestId(wrapper, 'ticket-changes').exists()).toBe(false)
    })

    it('GIVEN a lone dinner WHEN opened THEN only this dinner\'s fragment shows, headed by the dinner', async () => {
        const wrapper = await mount({dinnerFragment: dinnerSpendingFragment(LASAGNE, expenses), teamFragment: null})
        await wrapper.find('button[name="toggle-budget-details"]').trigger('click')
        await wrapper.vm.$nextTick()
        expect(findAllByTestId(wrapper, 'cooking-round')).toHaveLength(1)
        expect(findByTestId(wrapper, 'cooking-round-heading').text()).toBe(ownHeading)
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
