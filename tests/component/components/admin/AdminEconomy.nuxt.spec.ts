// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {registerEndpoint, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {nextTick, toValue, type ComponentPublicInstance} from 'vue'
import {enableAutoUnmount} from '@vue/test-utils'
import AdminEconomy from '~/components/admin/AdminEconomy.vue'
import {useBookingsStore} from '~/stores/bookings'
import {usePlanStore} from '~/stores/plan'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {mountWithTooltipProvider, mountedStore, resetStores, registerEmptyStoreEndpoints, holdEndpoint, findAllLoadingRows, untilTrue, isTableLoading, findByTestId, cellsByHeader, tableHeaders} from '~~/tests/component/testHelpers'
import type {StatBox} from '~/components/economy/CostEntry.vue'
import {BOOKING_WORDS} from '~/config/bookingWords'
import {BUTTON_WORDS} from '~/config/buttonWords'

// The test environment has no router to land a deep link on, and no session cookie
const {mockRoute, mockNavigateTo, landNavigation, useRoute, session, useUserSession} = await vi.hoisted(async () => {
    const {mockRouteAndNavigation, mockSession} = await import('~~/tests/component/hoistedMocks')
    return {...mockRouteAndNavigation({path: '/admin/economy', params: {tab: 'economy'}}), ...mockSession()}
})
mockNuxtImport('useRoute', () => useRoute)
mockNuxtImport('navigateTo', () => mockNavigateTo)
mockNuxtImport('useUserSession', () => useUserSession)
mockNavigateTo.mockImplementation(landNavigation)

const period = BillingFactory.defaultSummaryData('admin-economy')
const invoice = period.invoices[0]!
registerEmptyStoreEndpoints()
registerEndpoint(`/api/admin/billing/periods/${period.id}`, () => period)
registerEndpoint('/api/admin/billing/periods', () => [period])
registerEndpoint(`/api/admin/billing/invoices/${invoice.id}`, () => [])

// The next test's resetStores drops the datasets a still-mounted page reads
enableAutoUnmount(afterEach)

type Store = ReturnType<typeof useBookingsStore>
type Wrapper = Awaited<ReturnType<typeof mountWithTooltipProvider>>

// Opens the table row that reads `row` by its button `label`
const open = async (wrapper: Wrapper, row: string, label: string) => {
    await vi.waitFor(() => expect(wrapper.findAll('tr').some(tr => tr.text().includes(row))).toBe(true))
    await wrapper.findAll('tr').find(tr => tr.text().includes(row))!.find(`button[aria-label="${label}"]`).trigger('click')
}

// Each open cost entry's title and the labels of its boxes. CostEntry is generic over its entry: the spec hands the
// accessors the entry the component renders
type CostEntryProps = {entry: unknown, titleAccessor?: (entry: unknown) => string, statsAccessor?: (entry: unknown) => StatBox[]}
const costEntriesOf = (wrapper: Wrapper) =>
    wrapper.findAllComponents<ComponentPublicInstance<CostEntryProps>>({name: 'CostEntry'}).map(entry => ({
        title: entry.props('titleAccessor')?.(entry.props('entry')),
        stats: entry.props('statsAccessor')?.(entry.props('entry')).map(stat => stat.label)
    }))

describe('AdminEconomy - the billing selection in the URL', () => {
    beforeEach(() => {
        resetStores()
        session.user.value = UserFactory.defaultUserWithInhabitant('admin-economy')
        mockRoute.query = {}
        mountedStore(useBookingsStore).loadBillingOverview(() => true)
    })

    describe.each([
        {param: 'period', id: period.id, setter: 'selectBillingPeriod' as const, selectedId: (store: Store) => store.selectedBillingPeriodId},
        {param: 'invoice', id: invoice.id, setter: 'selectInvoice' as const, selectedId: (store: Store) => store.selectedInvoiceId}
    ])('?$param=', ({param, id, setter, selectedId}) => {
        const landOn = () => {
            mockRoute.query = {period: String(period.id), invoice: String(invoice.id)}
        }

        it('hands the store the URL\'s selection once at setup, and the store follows the URL with no further setter call: a cleared param deselects', async () => {
            landOn()
            const select = vi.spyOn(mountedStore(useBookingsStore), setter)

            await mountWithTooltipProvider(AdminEconomy)

            expect(select).toHaveBeenCalledTimes(1)
            const choice = select.mock.calls[0]![0]
            expect(toValue(choice)).toBe(id)
            await vi.waitFor(() => expect(selectedId(useBookingsStore())).toBe(id))

            const {[param]: _cleared, ...rest} = mockRoute.query
            mockRoute.query = rest

            expect(toValue(choice)).toBeNull()
            await vi.waitFor(() => expect(selectedId(useBookingsStore())).toBeNull())
            expect(select).toHaveBeenCalledTimes(1)
        })
    })
})

// An invoice's dinners load when it opens: the breakdown shows its loading row, never the invoice opened before it
describe('AdminEconomy - an opened invoice while its transactions load', () => {
    let held: ReturnType<typeof holdEndpoint>

    beforeEach(() => {
        resetStores()
        session.user.value = UserFactory.defaultUserWithInhabitant('admin-economy')
        mockRoute.query = {}
        mountedStore(useBookingsStore).loadBillingOverview(() => true)
        held = holdEndpoint(`/api/admin/billing/invoices/${invoice.id}`, [])
    })

    afterEach(() => {
        held.release()
        held.unregister()
    })

    it('GIVEN the invoice\'s transactions are on the way THEN its breakdown shows the loading row, WHEN they land THEN the invoice\'s own answer', async () => {
        const wrapper = await mountWithTooltipProvider(AdminEconomy)
        await open(wrapper, BOOKING_WORDS.billing.state.closed, BUTTON_WORDS.openDetails)
        await open(wrapper, invoice.address, BOOKING_WORDS.billing.show.transactions)

        // The upcoming orders above load beside it: the invoice's breakdown is one of the page's loading rows
        await vi.waitFor(() => expect(findAllLoadingRows(wrapper).map(row => row.text())).toContainEqual(expect.stringContaining('Henter transaktioner...')))

        held.release()

        await vi.waitFor(() => expect(wrapper.text()).toContain('Ingen transaktioner på denne faktura.'))
    })
})

describe('AdminEconomy - the upcoming orders', () => {
    const season = {...SeasonFactory.defaultSeason('admin-economy'), id: 7}
    const dinnerEvent = {id: 31, date: new Date(2030, 0, 7), menuTitle: 'Lasagne'}
    const upcoming = [OrderFactory.defaultOrder('admin-economy', {id: 501, dinnerEventId: dinnerEvent.id, dinnerEvent})]
    const upcomingTable = (wrapper: Wrapper) =>
        wrapper.findAllComponents({name: 'EconomyTable'}).find(table => table.props('loadingText') === 'Henter fremtidige bestillinger')!
    const dinnerRow = (wrapper: Wrapper) => findByTestId(wrapper, `future-orders-expand-${dinnerEvent.id}`)
    const mountLoaded = async () => {
        const wrapper = await mountWithTooltipProvider(AdminEconomy)
        await untilTrue(() => mountedStore(usePlanStore).isPlanStoreReady && mountedStore(useBookingsStore).isUpcomingOrdersLoaded)
        await nextTick()
        return wrapper
    }
    const unregister: Array<() => void> = []

    beforeEach(() => {
        resetStores()
        session.user.value = UserFactory.defaultUserWithInhabitant('admin-economy')
        mockRoute.query = {}
        unregister.push(
            registerEndpoint('/api/admin/season/active', () => season.id),
            registerEndpoint('/api/admin/season', () => [season]),
            registerEndpoint(`/api/admin/season/${season.id}`, () => season),
            registerEndpoint('/api/order', () => upcoming),
            registerEndpoint('/api/household/order/scaffold', {method: 'POST', handler: () => OrderFactory.defaultScaffoldOrdersResponse()})
        )
        mountedStore(useBookingsStore).loadBillingOverview(() => true)
    })

    afterEach(() => {
        unregister.splice(0).forEach(remove => remove())
    })

    it('GIVEN the upcoming orders have loaded THEN the dinner\'s row reads the dinner\'s menu title under Menu', async () => {
        const wrapper = await mountLoaded()

        expect(cellsByHeader(upcomingTable(wrapper)).Menu).toBe(dinnerEvent.menuTitle)
    })

    // The first column of each table holds the row's expand button
    it('GIVEN the upcoming orders have loaded WHEN a dinner opens THEN the table heads its columns and the dinner\'s boxes read its households, portions and total in the billing words', async () => {
        const wrapper = await mountLoaded()
        const {columns, stats} = BOOKING_WORDS.billing
        // Read before the dinner opens: its households' table nests in the row
        expect(tableHeaders(upcomingTable(wrapper))).toEqual(['', columns.date, columns.menu, stats.tickets, columns.amount])

        await dinnerRow(wrapper).trigger('click')
        await nextTick()

        expect(costEntriesOf(upcomingTable(wrapper)).map(entry => entry.stats)).toEqual([[stats.households, stats.tickets, stats.total]])
    })

    it('GIVEN the billing periods have loaded WHEN a closed period opens THEN the table heads its columns and the period reads its title and its counts in the billing words', async () => {
        const wrapper = await mountLoaded()
        const {period, columns, stats, state} = BOOKING_WORDS.billing
        await vi.waitFor(() => expect(wrapper.text()).toContain(state.closed))
        const periodsTable = wrapper.findAllComponents({name: 'EconomyTable'}).find(table => table.text().includes(state.closed))!
        // Read before the period opens: its invoices' table nests in the row
        expect(tableHeaders(periodsTable)).toEqual(['', columns.status, columns.period, stats.dinners, stats.tickets, stats.households, columns.revenue, columns.control, columns.share])

        await open(wrapper, state.closed, BUTTON_WORDS.openDetails)

        await vi.waitFor(() => expect(costEntriesOf(periodsTable)).toEqual([{title: period.settled, stats: [stats.households, stats.dinners, stats.tickets, stats.total]}]))
    })

    it('GIVEN the economy has loaded THEN the cards, the badges and the period search read the billing words, WHEN a dinner opens THEN its households\' search and toggles', async () => {
        const wrapper = await mountLoaded()
        const {titles, state, search, show} = BOOKING_WORDS.billing
        await vi.waitFor(() => expect(wrapper.text()).toContain(state.closed))
        expect([titles.future, titles.periods, state.running].filter(word => !wrapper.text().includes(word))).toEqual([])
        expect(wrapper.findAllComponents({name: 'EconomyTable'}).map(table => table.props('searchPlaceholder'))).toContain(search.period)

        await dinnerRow(wrapper).trigger('click')
        await nextTick()

        expect(upcomingTable(wrapper).find(`input[placeholder="${search.household}"]`).exists()).toBe(true)
        expect(upcomingTable(wrapper).find(`button[aria-label="${show.orders}"]`).exists()).toBe(true)
    })

    // The upcoming orders table binds its dataset's loading: a correction's re-read runs the loading bar while the rows stay
    it('GIVEN the upcoming orders have loaded WHEN a correction saves THEN its re-read runs the table\'s loading bar while the dinner\'s row stays, until the orders land', async () => {
        const wrapper = await mountLoaded()
        const store = mountedStore(useBookingsStore)
        expect(isTableLoading(upcomingTable(wrapper))).toBe(false)
        expect(dinnerRow(wrapper).exists()).toBe(true)

        const held = holdEndpoint('/api/order', upcoming)
        unregister.push(held.unregister)
        const saved = store.processAdminCorrection(1, 1, [])
        try {
            await untilTrue(() => !store.isUpcomingOrdersLoaded)
            await nextTick()
            expect(isTableLoading(upcomingTable(wrapper))).toBe(true)
            expect(dinnerRow(wrapper).exists()).toBe(true)

            held.release()
            await saved
            await untilTrue(() => store.isUpcomingOrdersLoaded)
            await nextTick()
            expect(isTableLoading(upcomingTable(wrapper))).toBe(false)
            expect(dinnerRow(wrapper).exists()).toBe(true)
        } finally {
            // The save and its held re-read settle inside the case, so nothing answers into the next one
            held.release()
            await saved.catch(() => undefined)
        }
    })
})
