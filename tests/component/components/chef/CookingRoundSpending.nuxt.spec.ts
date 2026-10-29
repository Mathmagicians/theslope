// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {nextTick} from 'vue'
import {enableAutoUnmount, type BaseWrapper} from '@vue/test-utils'
import CookingRoundSpending from '~/components/chef/CookingRoundSpending.vue'
import CookingTeamBadges from '~/components/shared/CookingTeamBadges.vue'
import {cookingRoundWords, dinnerSpendingFragment, teamSpendingFragment, type CookingRoundRow, type SpendingFragment} from '~/composables/useBookingUi'
import {ExpenseFactory} from '~~/tests/e2e/testDataFactories/expenseFactory'
import {useTicket} from '~/composables/useTicket'
import {formatDate, DATE_SETTINGS} from '~/utils/date'
import {mountWithTooltipProvider, findByTestId, resetStores, registerEmptyStoreEndpoints, holdEndpoint, isTableLoading, untilTrue} from '~~/tests/component/testHelpers'
import {useBookingsStore} from '~/stores/bookings'
import {useTheSlopeDesignSystem} from '~/composables/useTheSlopeDesignSystem'
import {BOOKING_WORDS} from '~/config/bookingWords'

// Only HTTP is faked (testing.md Rule 6): the bookings store reads the round's orders
registerEmptyStoreEndpoints()

enableAutoUnmount(afterEach)

beforeEach(() => {
    resetStores()
})

/**
 * CookingRoundSpending: a fragment of the one spending table. The team's round: the team's badge as heading, one row
 * per cooking day with a dot and the bold name on the dinner on view, the team's total row under its badge. This
 * dinner: its heading, its receipts as rows, its figures in the total row, the table's empty state without receipts.
 */
const {formatPrice} = useTicket()
const {COMPONENTS, ICONS} = useTheSlopeDesignSystem()

// The round over three days, Risotto the dinner on view
const LASAGNE: CookingRoundRow = {dinnerEventId: 1, date: new Date('2026-04-12T18:00:00'), menuTitle: 'Lasagne', isCurrent: false, budgetGross: 178100, spentGross: 192500}
const BOLLER: CookingRoundRow = {dinnerEventId: 2, date: new Date('2026-04-13T18:00:00'), menuTitle: 'Boller i karry', isCurrent: false, budgetGross: 189000, spentGross: 174400}
const RISOTTO: CookingRoundRow = {dinnerEventId: 3, date: new Date('2026-04-14T18:00:00'), menuTitle: 'Risotto', isCurrent: true, budgetGross: 187300, spentGross: 163800}
const rows = [LASAGNE, BOLLER, RISOTTO]
const words = cookingRoundWords('Madhold 2', 2, LASAGNE.date, RISOTTO.date)

const mount = (props: {fragment: SpendingFragment}) => mountWithTooltipProvider(CookingRoundSpending, {props, isMd: true})
// The table's body rows without the total row the body-bottom slot adds
const dataRows = (wrapper: Awaited<ReturnType<typeof mount>>) => wrapper.findAll('tbody tr').filter(tr => tr.attributes('data-testid') !== 'cooking-round-total')
// A body row and a row's cell by their place, the first at 1; the body rows come before the total row
const rowAt = (wrapper: BaseWrapper<Node>, place: number) => wrapper.find(`tbody tr:nth-child(${place})`)
const cellAt = (row: BaseWrapper<Node>, place: number) => row.find(`td:nth-child(${place})`)
const dayMonth = (date: Date) => formatDate(date, DATE_SETTINGS.DAY_MONTH_MASK)

describe('CookingRoundSpending, the team\'s round', () => {
    it('renders the team\'s badge and the period as heading, one row per dinner in order with date and menu, the dot and the bold name on the dinner on view, each row\'s figures, and the team\'s total row', async () => {
        const wrapper = await mount({fragment: teamSpendingFragment(rows, words)})
        // The heading is the team's colour badge, its name alone, followed by the period; the total row reads the team as text
        const heading = findByTestId(wrapper, 'cooking-round-heading')
        expect(heading.findComponent(CookingTeamBadges).props()).toMatchObject({teamName: 'Madhold 2', teamNumber: 2, showCounts: false})
        expect(heading.text()).toContain(words.period)
        expect(wrapper.findAllComponents(CookingTeamBadges)).toHaveLength(1)
        expect(dataRows(wrapper)).toHaveLength(3)
        rows.forEach((row, index) => {
            expect(cellAt(rowAt(wrapper, index + 1), 1).text()).toBe(dayMonth(row.date))
            expect(rowAt(wrapper, index + 1).text()).toContain(row.menuTitle)
        })
        // The dinner on view reads a dot before its name and the name in bold; the other days read their name alone
        const marker = cellAt(rowAt(wrapper, 3), 2).findComponent({name: 'UIcon'})
        expect(marker.attributes('data-testid')).toBe('cooking-round-marker')
        expect(marker.props('name')).toBe(ICONS.dot)
        expect(marker.element.parentElement?.className).toBe(COMPONENTS.table.currentDinnerLabel)
        expect(findByTestId(rowAt(wrapper, 1), 'cooking-round-marker').exists()).toBe(false)
        expect(cellAt(rowAt(wrapper, 1), 2).find('span').classes().join(' ')).toBe(COMPONENTS.table.dinnerLabel)

        // Each row's allowance, spending and what is left in both units, red with the exclamation icon when over
        const over = rowAt(wrapper, 1)
        expect(over.text()).toContain(`/ ${formatPrice(178100)} kr`)
        expect(over.text()).toContain(`/ ${formatPrice(192500)} kr`)
        expect(over.text()).toContain(`/ -${formatPrice(14400)} kr`)
        expect(findByTestId(over, 'vat-amount-over').exists()).toBe(true)
        expect(findByTestId(rowAt(wrapper, 2), 'vat-amount-ok').exists()).toBe(true)

        // The round sums into the team's total row
        const total = findByTestId(wrapper, 'cooking-round-total')
        expect(total.text()).toContain('Madhold 2')
        expect(total.text()).toContain(`/ ${formatPrice(178100 + 189000 + 187300)} kr`)
        expect(total.text()).toContain(`/ ${formatPrice(192500 + 174400 + 163800)} kr`)
        expect(total.text()).toContain(`/ +${formatPrice(178100 + 189000 + 187300 - 192500 - 174400 - 163800)} kr`)
        expect(findByTestId(total, 'vat-amount-ok').exists()).toBe(true)
    })

    it('heads the round on the line that keeps the badge and the period whole', async () => {
        const wrapper = await mount({fragment: teamSpendingFragment(rows, words)})
        expect(findByTestId(wrapper, 'cooking-round-heading').element.parentElement?.className).toBe(COMPONENTS.dinnerBudget.roundHeadingLine)
    })

    it('GIVEN a dinner without tickets yet WHEN rendering THEN its Tilbage carries the waiting glyph, not the check', async () => {
        const empty: CookingRoundRow = {dinnerEventId: 4, date: new Date('2026-04-15T18:00:00'), menuTitle: 'Pasta', isCurrent: false, budgetGross: 0, spentGross: 0}
        const wrapper = await mount({fragment: teamSpendingFragment([...rows, empty], words)})
        const last = rowAt(wrapper, 4)
        expect(findByTestId(last, 'vat-amount-pending').exists()).toBe(true)
        expect(findByTestId(last, 'vat-amount-ok').exists()).toBe(false)
    })

    it('GIVEN a dinner without a menu title WHEN rendering THEN its Middag cell reads the untitled dinner\'s name', async () => {
        const untitled: CookingRoundRow = {...RISOTTO, menuTitle: ''}
        const wrapper = await mount({fragment: teamSpendingFragment([LASAGNE, untitled], words)})
        expect(cellAt(rowAt(wrapper, 2), 2).text()).toBe(BOOKING_WORDS.untitledDinner)
    })
})

describe('CookingRoundSpending headings', () => {
    it.each([
        {fragment: 'the team\'s round', build: () => teamSpendingFragment(rows, words)},
        {fragment: 'this dinner', build: () => dinnerSpendingFragment(RISOTTO, [])}
    ])('$fragment names the units of its figures beside its heading', async ({build}) => {
        const wrapper = await mount({fragment: build()})
        expect(findByTestId(wrapper, 'cooking-round-heading').element.parentElement?.textContent).toContain(BOOKING_WORDS.vatUnits)
    })
})

describe('CookingRoundSpending, this dinner', () => {
    const NOTE = '"Risotto" 14/04/2026, Anna H. bestiller for Madhold 2'
    const receipt = ExpenseFactory.defaultExpense({id: 7, amount: 126500, description: NOTE, createdAt: new Date('2026-04-12T10:00:00')})

    it('heads with the menu title and date, lists the receipts with their note and amount, and carries the figures in the total row', async () => {
        const wrapper = await mount({fragment: dinnerSpendingFragment(RISOTTO, [receipt])})
        expect(findByTestId(wrapper, 'cooking-round-heading').text()).toBe(`Risotto, ${dayMonth(RISOTTO.date)}`)
        expect(dataRows(wrapper)).toHaveLength(1)
        const line = rowAt(wrapper, 1)
        expect(cellAt(line, 1).text()).toBe(dayMonth(receipt.createdAt))
        expect(line.text()).toContain(NOTE)
        expect(line.text()).toContain(`/ ${formatPrice(126500)} kr`)
        expect(findByTestId(line, 'cooking-round-marker').exists()).toBe(false)
        const total = findByTestId(wrapper, 'cooking-round-total')
        expect(total.text()).toContain('Risotto')
        expect(total.text()).toContain(`/ ${formatPrice(187300)} kr`)
        expect(total.text()).toContain(`/ +${formatPrice(187300 - 163800)} kr`)
    })

    it('heads the dinner on the line its long title wraps on, the unit words below it', async () => {
        const longTitle: CookingRoundRow = {dinnerEventId: 9, date: new Date('2026-04-14T18:00:00'), menuTitle: 'Langtidsstegt lammekølle med rodfrugter og persillesovs', isCurrent: true, budgetGross: 187300, spentGross: 163800}
        const wrapper = await mount({fragment: dinnerSpendingFragment(longTitle, [receipt])})
        expect(findByTestId(wrapper, 'cooking-round-heading').element.parentElement?.className).toBe(COMPONENTS.dinnerBudget.dinnerHeadingLine)
    })

    it('GIVEN no receipts WHEN rendering THEN the table\'s empty state is a noReceipts message', async () => {
        const wrapper = await mount({fragment: dinnerSpendingFragment(RISOTTO, [])})
        expect(dataRows(wrapper)).toHaveLength(1)
        expect(findByTestId(wrapper, 'cooking-round-empty').text()).toContain(useTheSlopeDesignSystem().getRandomEmptyMessage('noReceipts', new Date()).text)
    })
})

// The team's round reads each day's allowance off the round's orders; this dinner's rows are its receipts
describe('CookingRoundSpending while the round\'s orders load', () => {
    const receipt = ExpenseFactory.defaultExpense({id: 8, amount: 126500, description: 'Indkøb', createdAt: new Date('2026-04-12T10:00:00')})
    let held: ReturnType<typeof holdEndpoint>

    beforeEach(async () => {
        held = holdEndpoint('/api/order', [])
        const store = useBookingsStore()
        store.loadOrdersForDinners({dinnerEventIds: rows.map(row => row.dinnerEventId), allHouseholds: true})
        await untilTrue(() => store.isOrdersLoading)
    })

    afterEach(() => {
        held.release()
        held.unregister()
    })

    it('GIVEN the orders are on the way THEN the team\'s round runs its loading bar over its days and total, WHEN they land THEN the bar stops', async () => {
        const wrapper = await mount({fragment: teamSpendingFragment(rows, words)})

        expect(isTableLoading(wrapper)).toBe(true)
        expect(wrapper.text()).toContain(LASAGNE.menuTitle)
        expect(findByTestId(wrapper, 'cooking-round-total').exists()).toBe(true)

        held.release()

        await untilTrue(() => !useBookingsStore().isOrdersLoading)
        await nextTick()
        expect(isTableLoading(wrapper)).toBe(false)
    })

    it('GIVEN the orders are on the way THEN this dinner\'s receipts carry no loading: they come from the dinner, not the orders', async () => {
        const wrapper = await mount({fragment: dinnerSpendingFragment(RISOTTO, [receipt])})

        expect(isTableLoading(wrapper)).toBe(false)
        expect(wrapper.text()).toContain('Indkøb')
    })
})
