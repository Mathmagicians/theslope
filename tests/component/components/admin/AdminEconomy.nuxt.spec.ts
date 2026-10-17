// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {registerEndpoint, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {nextTick, toValue} from 'vue'
import {enableAutoUnmount} from '@vue/test-utils'
import AdminEconomy from '~/components/admin/AdminEconomy.vue'
import {useBookingsStore} from '~/stores/bookings'
import {usePlanStore} from '~/stores/plan'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {mountWithTooltipProvider, mountedStore, resetStores, registerEmptyStoreEndpoints, holdEndpoint, findAllLoadingRows, untilTrue} from '~~/tests/component/testHelpers'

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

    const open = async (wrapper: Awaited<ReturnType<typeof mountWithTooltipProvider>>, row: string, label: string) => {
        await vi.waitFor(() => expect(wrapper.findAll('tr').some(tr => tr.text().includes(row))).toBe(true))
        await wrapper.findAll('tr').find(tr => tr.text().includes(row))!.find(`button[aria-label="${label}"]`).trigger('click')
    }

    it('GIVEN the invoice\'s transactions are on the way THEN its breakdown shows the loading row, WHEN they land THEN the invoice\'s own answer', async () => {
        const wrapper = await mountWithTooltipProvider(AdminEconomy)
        await open(wrapper, 'Afsluttet', 'Vis detaljer')
        await open(wrapper, invoice.address, 'Vis transaktioner')

        // The upcoming orders above load beside it: the invoice's breakdown is one of the page's loading rows
        await vi.waitFor(() => expect(findAllLoadingRows(wrapper).map(row => row.text())).toContainEqual(expect.stringContaining('Henter transaktioner...')))

        held.release()

        await vi.waitFor(() => expect(wrapper.text()).toContain('Ingen transaktioner på denne faktura.'))
    })
})

// The upcoming orders table binds its dataset's loading: a correction's re-read shows the loading row, as any reload does
describe('AdminEconomy - the upcoming orders while a correction re-reads them', () => {
    const season = {...SeasonFactory.defaultSeason('admin-economy'), id: 7}
    const UPCOMING_LOADING = 'Henter fremtidige bestillinger'
    const upcomingLoading = (wrapper: Awaited<ReturnType<typeof mountWithTooltipProvider>>) =>
        findAllLoadingRows(wrapper).some(row => row.text().includes(UPCOMING_LOADING))
    const unregister: Array<() => void> = []

    beforeEach(() => {
        resetStores()
        session.user.value = UserFactory.defaultUserWithInhabitant('admin-economy')
        mockRoute.query = {}
        unregister.push(
            registerEndpoint('/api/admin/season/active', () => season.id),
            registerEndpoint('/api/admin/season', () => [season]),
            registerEndpoint(`/api/admin/season/${season.id}`, () => season),
            registerEndpoint('/api/household/order/scaffold', {method: 'POST', handler: () => OrderFactory.defaultScaffoldOrdersResponse()})
        )
        mountedStore(useBookingsStore).loadBillingOverview(() => true)
    })

    afterEach(() => {
        unregister.splice(0).forEach(remove => remove())
    })

    it('GIVEN the upcoming orders have loaded WHEN a correction saves THEN its re-read shows the loading row, until the orders land', async () => {
        const wrapper = await mountWithTooltipProvider(AdminEconomy)
        const store = mountedStore(useBookingsStore)
        const plan = mountedStore(usePlanStore)
        await untilTrue(() => plan.isPlanStoreReady && store.isUpcomingOrdersLoaded)
        await nextTick()
        expect(upcomingLoading(wrapper)).toBe(false)

        const held = holdEndpoint('/api/order', [])
        unregister.push(held.unregister)
        const saved = store.processAdminCorrection(1, 1, [])
        try {
            await untilTrue(() => !store.isUpcomingOrdersLoaded)
            await nextTick()
            expect(upcomingLoading(wrapper)).toBe(true)

            held.release()
            await saved
            await untilTrue(() => store.isUpcomingOrdersLoaded)
            await nextTick()
            expect(upcomingLoading(wrapper)).toBe(false)
        } finally {
            held.release()
            await saved.catch(() => undefined)
        }
    })
})
