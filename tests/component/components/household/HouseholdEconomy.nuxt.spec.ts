// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {registerEndpoint, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {nextTick, shallowReactive} from 'vue'
import {getQuery, type H3Event} from 'h3'
import {enableAutoUnmount} from '@vue/test-utils'
import HouseholdEconomy from '~/components/household/HouseholdEconomy.vue'
import {useBookingsStore} from '~/stores/bookings'
import {usePlanStore} from '~/stores/plan'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {mountWithTooltipProvider, mountedStore, resetStores, registerEmptyStoreEndpoints, untilTrue, cellsByHeader, tableHeaders, itemAt, present} from '~~/tests/component/testHelpers'
import {BOOKING_WORDS} from '~/config/bookingWords'
import {BUTTON_WORDS} from '~/config/buttonWords'
import {useBillingValidation} from '~/composables/useBillingValidation'
import {useTicket} from '~/composables/useTicket'

// The test environment has no session cookie
const {session, useUserSession} = await vi.hoisted(async () => (await import('~~/tests/component/hoistedMocks')).mockSession())
mockNuxtImport('useUserSession', () => useUserSession)

const SALT = 'household-economy'
const member = UserFactory.defaultUserWithInhabitant(SALT)
// The member's own household: the households store selects it from the session
const household = {...HouseholdFactory.defaultHouseholdDetail(SALT), id: present(member.Inhabitant?.household, 'the member\'s household').id}
const season = {...SeasonFactory.defaultSeason(SALT), id: 7}
const dinnerEvent = DinnerEventFactory.defaultDinnerEventDisplay(SALT)
// A member who moved in after the household loaded: the order carries an eater the household does not list yet
const eater = {...itemAt(household.inhabitants, 0), id: 9001, name: 'Nyindflyttet'}
const upcoming = [OrderFactory.defaultOrder(SALT, {dinnerEventId: dinnerEvent.id, inhabitantId: eater.id, dinnerEvent, inhabitant: eater})]

// Only HTTP is faked
registerEmptyStoreEndpoints()
registerEndpoint('/api/admin/season/active', () => season.id)
registerEndpoint('/api/admin/season', () => [season])
registerEndpoint(`/api/admin/season/${season.id}`, () => season)
registerEndpoint(`/api/admin/household/${household.id}`, () => household)
// A case that needs transactions in the running period sets its own billing
const emptyBilling = BillingFactory.defaultHouseholdBilling(household.id)
let billing = emptyBilling
const billingEndpoint = vi.fn<(event: H3Event) => unknown>(() => billing)
const ordersEndpoint = vi.fn<(event: H3Event) => unknown>(() => upcoming)
registerEndpoint('/api/billing', billingEndpoint)
registerEndpoint('/api/order', ordersEndpoint)

// The next test's resetStores drops the datasets a still-mounted view reads
enableAutoUnmount(afterEach)

// The view once the season, the upcoming orders and the billing have loaded
const mountLoaded = async (props = {household}) => {
    const wrapper = await mountWithTooltipProvider(HouseholdEconomy, {props})
    const bookings = mountedStore(useBookingsStore)
    await untilTrue(() => mountedStore(usePlanStore).isSelectedSeasonInitialized && bookings.isUpcomingOrdersLoaded && bookings.householdBilling !== null)
    await nextTick()
    return wrapper
}

describe('HouseholdEconomy - the upcoming orders', () => {
    beforeEach(() => {
        resetStores()
        session.user.value = member
        billing = emptyBilling
    })

    it('GIVEN the upcoming orders have loaded THEN the dinner\'s row reads the dinner\'s menu title under Menu', async () => {
        const wrapper = await mountLoaded()

        // The first of the view's two tables: Kommende
        expect(cellsByHeader(wrapper.findComponent({name: 'EconomyTable'})).Menu).toBe(dinnerEvent.menuTitle)
    })

    it('GIVEN an upcoming order WHEN its dinner opens THEN its line reads the name its order carries', async () => {
        const wrapper = await mountLoaded()

        await wrapper.findComponent({name: 'EconomyTable'}).find(`button[aria-label="${BUTTON_WORDS.openDetails}"]`).trigger('click')

        const line = wrapper.findComponent({name: 'CostLine'}).text()
        expect(line).toContain(eater.name)
        expect(line).not.toContain(`#${eater.id}`)
    })

    it('GIVEN the billing has loaded THEN the cards, the expected sum, the running period\'s badge, the period search and the row toggles read the billing and button words', async () => {
        const wrapper = await mountLoaded()
        const {titles, sums, state, search} = BOOKING_WORDS.billing

        expect([titles.upcoming, titles.periods, sums.expected, state.running].filter(word => !wrapper.text().includes(word))).toEqual([])
        expect(wrapper.findAllComponents({name: 'EconomyTable'}).map(table => table.props('searchPlaceholder'))).toContain(search.period)
        expect(wrapper.findAll(`button[aria-label="${BUTTON_WORDS.openDetails}"]`)).not.toHaveLength(0)
    })

    it('GIVEN the billing has loaded THEN Kommende and the billing periods head their columns in the billing words', async () => {
        const wrapper = await mountLoaded()

        const {columns, stats} = BOOKING_WORDS.billing
        // The first column holds the row's expand button
        expect(wrapper.findAllComponents({name: 'EconomyTable'}).map(table => tableHeaders(table))).toEqual([
            ['', columns.date, columns.menu, stats.tickets, columns.amount],
            ['', columns.status, columns.period, stats.tickets, columns.amount, columns.control]
        ])
    })
})

describe('HouseholdEconomy - the running period', () => {
    const {TicketType} = useBillingValidation()
    const {formatTicketCounts, formatPrice} = useTicket()
    const dinners = [{id: 1, date: new Date(2025, 9, 20), menuTitle: 'Lasagne'}, {id: 2, date: new Date(2025, 9, 22), menuTitle: 'Suppe'}]
    // Two tickets on the first dinner, one on the second
    const transactions = [
        BillingFactory.defaultTransactionDisplay({id: 1, orderId: 1, dinnerEvent: itemAt(dinners, 0)}),
        BillingFactory.defaultTransactionDisplay({id: 2, orderId: 2, dinnerEvent: itemAt(dinners, 0), ticketType: TicketType.CHILD, amount: 1700}),
        BillingFactory.defaultTransactionDisplay({id: 3, orderId: 3, dinnerEvent: itemAt(dinners, 1)})
    ]
    const totalAmount = 9700

    beforeEach(() => {
        resetStores()
        session.user.value = member
        billing = {...emptyBilling, currentPeriod: {...emptyBilling.currentPeriod, totalAmount, transactions}}
    })

    it('GIVEN the running period holds three tickets on two dinners WHEN its row is opened THEN it reads the open period\'s title and stats, and each dinner opens to its ticket lines', async () => {
        const wrapper = await mountLoaded()

        const periods = itemAt(wrapper.findAllComponents({name: 'EconomyTable'}), 1)
        await periods.find(`button[aria-label="${BUTTON_WORDS.openDetails}"]`).trigger('click')
        const period = wrapper.findComponent({name: 'CostEntry'})
        const {period: periodWords, stats} = BOOKING_WORDS.billing
        expect(period.find('h4').text()).toBe(periodWords.open)
        // A stat box reads its value over its label
        expect([`2${stats.dinners}`, `${formatTicketCounts(transactions)}${stats.tickets}`, `${formatPrice(totalAmount)} kr${stats.total}`]
            .filter(stat => !period.text().includes(stat))).toEqual([])

        for (const open of period.findAll(`button[aria-label="${BOOKING_WORDS.billing.show.orders}"]`)) await open.trigger('click')
        expect(period.findAllComponents({name: 'CostLine'})).toHaveLength(transactions.length)
    })
})

describe('HouseholdEconomy - the household on view', () => {
    const nextHousehold = {...household, id: household.id + 1}
    const nextDinner = {...dinnerEvent, id: dinnerEvent.id + 1, menuTitle: 'Suppe hos naboen'}
    const nextOrders = [OrderFactory.defaultOrder(SALT, {dinnerEventId: nextDinner.id, inhabitantId: eater.id, dinnerEvent: nextDinner, inhabitant: eater})]
    const householdQuery = (endpoint: typeof ordersEndpoint) => getQuery(itemAt(endpoint.mock.calls, -1)[0]).householdId
    const nextHouseholdQuery = String(nextHousehold.id)

    beforeEach(() => {
        resetStores()
        session.user.value = member
        billing = emptyBilling
        billingEndpoint.mockClear()
        ordersEndpoint.mockClear()
    })

    it('GIVEN one household\'s economy WHEN the household prop changes THEN both requests name the new one and its orders replace the previous household\'s', async () => {
        const props = shallowReactive({household})
        const wrapper = await mountLoaded(props)
        ordersEndpoint.mockImplementationOnce(() => nextOrders)

        props.household = nextHousehold

        await vi.waitFor(() => expect(cellsByHeader(wrapper.findComponent({name: 'EconomyTable'})).Menu).toBe(nextDinner.menuTitle))
        expect(wrapper.text()).not.toContain(dinnerEvent.menuTitle)
        expect([householdQuery(ordersEndpoint), householdQuery(billingEndpoint)]).toEqual([nextHouseholdQuery, nextHouseholdQuery])
    })

    it('GIVEN the new household\'s billing has landed WHILE its orders are on the way THEN no order and no sum of the previous household shows', async () => {
        const props = shallowReactive({household})
        const wrapper = await mountLoaded(props)
        const bookings = mountedStore(useBookingsStore)
        const {titles, sums} = BOOKING_WORDS.billing
        expect(wrapper.text()).toContain(sums.expected)
        let land = () => {}
        ordersEndpoint.mockImplementationOnce(() => new Promise(resolve => {
            land = () => resolve(nextOrders)
        }))

        props.household = nextHousehold
        await vi.waitFor(() => expect(householdQuery(billingEndpoint)).toBe(nextHouseholdQuery))
        await vi.waitFor(() => expect(householdQuery(ordersEndpoint)).toBe(nextHouseholdQuery))
        await untilTrue(() => !bookings.isHouseholdBillingLoading)
        await nextTick()

        const onTheWay = wrapper.text()
        land()

        expect(onTheWay).toContain(titles.upcoming)
        expect(onTheWay).not.toContain(dinnerEvent.menuTitle)
        expect(onTheWay).not.toContain(sums.expected)
    })
})
